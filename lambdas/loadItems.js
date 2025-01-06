import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();

export const handler = async (event) => {
  const user = await prisma.user.findUnique({
    where: { anonymous_id: event.anonymous_id }
  });
  if (user == null) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Can\'t find user!' })
    };
  }
  console.log(user);
  var retrievedItems = [];
  var hasMore = true;
  if (event.item_uuid) {
    const item = await prisma.item.findUnique({
      where: {
        uuid: event.item_uuid,
        user: { id: user.id },
        is_deleted: false
      }
    });
    retrievedItems.push(item);
  } else if (event.loadAll) {
    retrievedItems = await prisma.item.findMany({
      where: {
        user: { id: user.id },
        is_deleted: false
      },
      orderBy: {
        rank_idx: 'asc'
      }
    });
  } else {

    const blockedUserIds = await prisma.$queryRaw`
    SELECT "blocked_user_id"
    FROM "UserBlock"
    GROUP BY "blocked_user_id"
    HAVING COUNT(*) > 2`;
    console.log("Number of Users blocked more than twice: " + blockedUserIds.length);

    console.log("onlyOpenParents: " + event.onlyOpenParents);
    console.log("onlyDoneItems: " + event.onlyDoneItems);

    let prismaParams = {
      where: {
        user: { id: user.id },
        is_deleted: false,
        ...(event.onlyOpenParents && {
          parent_item_id: null,
          is_done: false
        }),
        ...(event.onlyDoneItems && { is_done: true })   // is_done isn't defaulted for backwards compatibility
      },
      select: {
        is_done: true,
        is_public: true,
        uuid: true,
        text: true,
        scheduled_datetime_utc: true,
        event_id: true,
        userReactions: {
          where: {
            user: {
              id: {
                notIn: blockedUserIds.map((row) => row.blocked_user_id),
              },
              NOT: {
                blockedBys: {
                  some: {
                    blocking_user_id: user.id, // Exclude reactions where the user is blocked by the current user
                  },
                },
              }
            },
          },
          select: {
            user: {
              select: {
                name: true
              }
            },
            reaction: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        ...(event.onlyOpenParents && {  // return only children (and their parent UUID) on open page 
          children: {
            select: {
              uuid: true,
              text: true,
              scheduled_datetime_utc: true,
              event_id: true,
              is_done: true,
              parent: {
                select: {
                  uuid: true
                }
              }
            },
            where: {
              is_deleted: false
            },
            orderBy: {
              rank_idx: 'asc'
            }
          }
        }),
        ...(event.onlyDoneItems && ({ // return only parents on done page
          parent: {
            select: {
              uuid: true,
              text: true,
              is_done: true
            }
          }
        }))
      },
      orderBy: {
        ...((event.onlyOpenParents || !event.onlyDoneItems) && ( { rank_idx: 'asc' } )),
        ...(event.onlyDoneItems && ({ updatedAt: 'desc'}))
      }
    };

    // if (event.onlyOpenParents) {
    //   prismaParams.where = { ...prismaParams.where, is_done: false };
    // } else if (event.onlyDoneItems) {
    //   prismaParams.where = { ...prismaParams.where, is_done: true };
    // }

    retrievedItems = await prisma.item.findMany(prismaParams);

    if (event.onlyOpenParents) {
      const flattenItem = (item) => {
        const { children, ...parent } = item;
        return [parent, ...children];
      }
      retrievedItems = retrievedItems.flatMap((item) => flattenItem(item));
    }

    console.log("retrievedItems array length: " + retrievedItems.length);

    const pageSize = 15   // hardcode this for now
    if (!event.skipPagination) {
      const page = event.page || 1;
      const skip = (page - 1) * pageSize;
      const take = pageSize + 1;  // Take one more than pageSize to determine if there are more items

      console.log(`Applying skip (${skip}) and take (${take})`);

      const startIndex = skip || 0;
      retrievedItems = retrievedItems.slice(startIndex, startIndex + take);
      hasMore = retrievedItems.length > pageSize;
      console.log(`User does${(!hasMore) ? ' not' : ''} have more items.`);
      if (hasMore) {
        retrievedItems.pop();
      }
    } else {
      console.log("Skipping passing skip/take.");
      hasMore = false;
    }
  }
  console.log(`Returned ${((retrievedItems && retrievedItems.length) || 0)} items.`);

  for (var i = 0; i < retrievedItems.length; i++) {
    const item = retrievedItems[i];

    //console.log("Loaded item: " + JSON.stringify(item));

    // If item has a parent, cite its parent UUID in property recognized by UI
    if (item.parent) {
      retrievedItems[i].parent_item_uuid = item.parent.uuid;
    }

    try {

      item.text = await decryptText(item.text);   
      if (item.parent) {
        item.parent.text = await decryptText(item.parent.text);
      }

      if (!event.skipCounts) {

        // Obtain embedding for item text
        //console.log(`Begin count of similar items to item ${item.id}...`);
        const embedding_response = await axios.post(
          //"http://ip-172-31-31-53.us-east-2.compute.internal:8000/embed",    // PROD EC2 Instance
          "http://ip-172-31-28-150.us-east-2.compute.internal:8000/embed",    // DEV EC2 Instance
          { text: item.text }
        );
        const embedding = embedding_response.data.embedding;
        //console.log("Embedding: " + embedding);
        const embeddingArray = embedding.join(',');

        // Execute query to count how many similar items
        const num_close_embeddings = await prisma.$queryRawUnsafe(
          `SELECT COUNT(DISTINCT user_id) FROM "Item" WHERE id <> ` + item.id + ` AND 0.7 >= embedding <-> '[` +
          embeddingArray + `]'::vector AND user_id <> ` + user.id + `;`);

        //console.log("num close embeddings return: " + num_close_embeddings[0].count);
        // append count to item object
        retrievedItems[i].similar_count = Number(num_close_embeddings[0].count + ''); // Hack workaround to convert BigInt 

        // If item is done, return count of your tips for item
        // If item is not done, return count of tips on similar items
        if (item.is_done) {
          const tipCount = await prisma.tip.count({
            where: {
              item: {
                id: item.id
              },
              is_deleted: false
            }
          })
          //console.log("Setting tip count of item: " + tipCount);
          retrievedItems[i].tip_count = tipCount;
        } else {

          // Execute query to count how many tips from similar items
          const num_tips_of_close_embeddings = await prisma.$queryRawUnsafe(
            `SELECT COUNT(DISTINCT "Tip".id) FROM "Tip" LEFT JOIN "Item" on "Tip".item_id = "Item".id ` +
            `WHERE "Tip".is_deleted IS FALSE AND "Tip".is_flagged IS FALSE AND "Tip".user_id <> ` + user.id + ` AND 0.7 >= embedding <-> '[` +
            embeddingArray + `]'::vector;`);

          //console.log("Setting tip count of similar items: " + num_tips_of_close_embeddings[0].count);
          retrievedItems[i].tip_count = Number(num_tips_of_close_embeddings[0].count + ''); // Hack workaround to convert BigInt 
        }
      }
    } catch (error) {
      console.error('Error encrypting or decrypting:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Encryption/Decryption failed' })
      };
    }
  }

  //console.log("Retrieved Items prior to orphan removal: " + JSON.stringify(retrievedItems));

  // HACK ALERT:  Move any orphaned items to top of the list
  //              The UI was built to prevent orphans but they're still occurring occassionally.  
  //              Race conditions maybe?
  // retrievedItems = removeOrphans(retrievedItems);



  var response = null;
  if (event.loadAll) {
    response = {
      statusCode: 200,
      body: retrievedItems
    };
  } else {
    response = {
      statusCode: 200,
      body: { hasMore: hasMore, items: retrievedItems }
    };
  }
  await prisma.$disconnect();
  return response;
};

async function decryptText(encryptedText) {
  const decryptParams = {
    CiphertextBlob: Buffer.from(encryptedText, 'base64')
  };
  const decryptedData = await kms.decrypt(decryptParams).promise();
  return decryptedData.Plaintext.toString('utf-8');
}

function removeOrphans(items) {
  // Create a set of parent IDs from the list
  const parentUUIDs = new Set(items.filter(item => !item.parent_item_uuid).map(item => item.uuid));

  // Separate orphaned subitems and valid items
  const orphanedSubitems = [];
  const validItems = [];

  items.forEach(item => {
    if (item.parent_item_uuid && !parentUUIDs.has(item.parent_item_uuid)) {
      // Clear parentId for orphaned subitems
      item.parent_item_uuid = null;
      console.log("Identified item as orphan: " + JSON.stringify(item));
      orphanedSubitems.push(item);
    } else {
      validItems.push(item);
    }
  });

  console.log(`Discarding ${orphanedSubitems.length} subitems from the list - Prevent these from occurring!`);

  // Combine orphaned subitems at the top with the valid items
  return validItems;
}