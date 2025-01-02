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
      body: 'Can\'t find user!'
    };
  }
  console.log(user);
  var hasMore = true;

  const pageSize = 10   // hardcode this for now
  const page = event.page || 1;
  const skip = (page - 1) * pageSize;
  const take = pageSize + 1;  // Take one more than pageSize to determine if there are more items

  console.log(`Applying skip (${skip}) and take (${take})`);

  let prismaParams = {
    skip, take,
    where: {
      is_deleted: false,
      is_public: true,
      parent_item_id: null,
      user: {
        NOT: {
          blockedBys: {
            some: {
              blocking_user_id: user.id, // Exclude items where the user is blocked by the current user
            },
          },
        },
      }
    },
    select: {
      uuid: true,
      is_done: true,
      text: true,
      updatedAt: true,
      userReactions: {
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
      user: {
        select: {
          name: true
        }
      },
      children: {
        select: {
          uuid: true,
          text: true,
          is_done: true
        },
        where: {
          is_deleted: false
        },
        orderBy: {
          rank_idx: 'asc'
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  };

  let retrievedItems = await prisma.item.findMany(prismaParams);
  hasMore = retrievedItems.length > pageSize;

  console.log(`User does${(!hasMore) ? ' not' : ''} have more items.`);
  if (hasMore) {
    retrievedItems.pop();
  }

  console.log(`Returned ${((retrievedItems && retrievedItems.length) || 0)} items.`);

  var response;
  try {

    for (var i = 0; i < retrievedItems.length; i++) {
      
      // Decrypt item text
      retrievedItems[i].text = await decryptText(retrievedItems[i].text);

      // Decrypt text of items' children, if any
      if (retrievedItems[i].children.length > 0) {
        for (const child of retrievedItems[i].children) {
          child.text = await decryptText(child.text);
        }
      }
    }

    response = {
      statusCode: 200,
      body: { hasMore: hasMore, items: retrievedItems }
    }

  } catch (error) {
    response = {
      statusCode: 500,
      body: "Error decrypting item"
    }
  } finally {
    await prisma.$disconnect();
    return response;
  }
};

const decryptText = async (encryptedText) => {
  const decryptParams = {
    CiphertextBlob: Buffer.from(encryptedText, 'base64')
  };
  const decryptedData = await kms.decrypt(decryptParams).promise();
  return decryptedData.Plaintext.toString('utf-8');
}

