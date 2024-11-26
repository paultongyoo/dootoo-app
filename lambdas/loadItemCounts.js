import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
  try {
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

    const item = await prisma.item.findUnique({
      where: {
        uuid: event.item_uuid,
        user: { id: user.id },
        is_deleted: false
      }
    });
    if (item == null) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Can\'t find item owned by user!' })
      };
    }

    // Execute query to count how many similar items
    const num_close_embeddings = await prisma.$queryRawUnsafe(
      `SELECT COUNT(DISTINCT user_id) 
       FROM "Item" 
       WHERE id <> ${item.id}
       AND 0.7 >= embedding <-> (SELECT embedding from "Item" where "Item".id = ${item.id})
       AND user_id <> ${user.id};`);

    var countsObj = {};

    countsObj.similar_count = Number(num_close_embeddings[0].count + ''); // Hack workaround to convert BigInt 

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
      countsObj.tip_count = tipCount;
    } else {

      // Execute query to count how many tips from similar items
      const num_tips_of_close_embeddings = await prisma.$queryRawUnsafe(
        `SELECT COUNT(DISTINCT "Tip".id) 
         FROM "Tip" 
         LEFT JOIN "Item" on "Tip".item_id = "Item".id 
         WHERE "Tip".is_deleted IS FALSE 
           AND "Tip".is_flagged IS FALSE 
           AND "Tip".user_id <> ${user.id} 
           AND 0.7 >= embedding <-> (SELECT embedding from "Item" where "Item".id = ${item.id});`);

      //console.log("Setting tip count of similar items: " + num_tips_of_close_embeddings[0].count);
      countsObj.tip_count = Number(num_tips_of_close_embeddings[0].count + ''); // Hack workaround to convert BigInt 
    }

    console.log(`Returned counts Obj: ${JSON.stringify(countsObj)}`);

    return {
      statusCode: 200,
      body: countsObj
    };
  } catch (error) {
    console.error("Error calling loadItem API", error);
    return {
      statusCode: 403,
      body: "Error calling loadItem API"
    };
  } finally {
    await prisma.$disconnect();
  }
};
