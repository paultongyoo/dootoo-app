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
        body: 'Can\'t find user!'
      };
    }
    console.log(user);

    const itemUUIDs = event.item_uuids;

    const itemData = await prisma.item.findMany({
      where: {
        uuid: {
          in: itemUUIDs,
        },
        user: {
          id: user.id
        }
      },
      select: {
        id: true,
        is_done: true
      },
    });
    console.log(itemData);
    if (itemData.length != itemUUIDs.length) {
      const message = `Found mismatch of returned itemData (${itemData.length}) and itemUUIDs (${itemUUIDs.length}) - exitting!`;
      console.log(message);
      return {
        statusCode: 403,
        body: message
      }
    }

    const itemDataStr = JSON.stringify(itemData);

    // Convert the UUID array to a PostgreSQL-compatible format for the IN clause
    const itemIdList = `(${itemData.map((obj) => `'${obj.id}'`).join(", ")})`;

    const now = new Date();

    const query = `
  WITH similar_counts AS (
      SELECT
          a.id AS item_id,
          COUNT(b.id) AS similar_count
      FROM
          "Item" AS a
      JOIN
          "Item" AS b
      ON
          a.embedding <-> b.embedding < 0.7 -- Cosine distance threshold
      WHERE
          a.id IN ${itemIdList}
      AND b."createdAt" >= '${now.toISOString()}'::timestamp - interval '24 hours' -- Items created within 24 hours
      AND b."createdAt" <= '${now.toISOString()}'::timestamp -- Up to the current time
      AND b.user_id <> ${user.id}
      GROUP BY
          a.id
  ),
  tip_counts AS (
      SELECT
          i.id AS item_id,
          CASE 
              -- When is_done is true, count tips created by the user for the specific item
              WHEN i.id IN (SELECT (d->>'id')::int FROM jsonb_array_elements('${itemDataStr}'::jsonb) d WHERE d->>'is_done' = 'true') THEN (
                  SELECT COUNT(*)
                  FROM "Tip" t
                  WHERE t.item_id = i.id 
                    AND t.user_id = ${user.id}
                    AND t.is_deleted IS FALSE
              )
              -- When is_done is false, count tips for all similar items
              ELSE (
                  SELECT COUNT(*)
                  FROM "Tip" t
                  WHERE t.item_id IN (
                            SELECT b.id
                            FROM "Item" AS b
                            WHERE i.embedding <-> b.embedding < 0.7 -- Similar items based on cosine distance
                        )
                    AND t.is_flagged IS FALSE 
                    AND t.is_deleted IS FALSE
                    AND t.user_id <> ${user.id} 
                    AND t.user_id NOT IN (
                            SELECT blocked_user_id 
                            FROM "UserBlock" 
                            WHERE blocking_user_id = ${user.id}
                        )
                    AND t.user_id NOT IN (
                            SELECT blocking_user_id 
                            FROM "UserBlock" 
                            WHERE blocked_user_id = ${user.id}
                        )   
              )
          END AS tip_count
      FROM
          "Item" i
      WHERE
          i.id IN ${itemIdList}
  )
  SELECT
      i.uuid AS item_uuid,
      COALESCE(CAST(sc.similar_count AS INTEGER), 0) as similar_count,
      COALESCE(CAST(tc.tip_count AS INTEGER), 0) as tip_count
  FROM
      "Item" i
  LEFT JOIN
      similar_counts sc ON i.id = sc.item_id
  LEFT JOIN
      tip_counts tc ON i.id = tc.item_id
  WHERE
      i.id IN ${itemIdList};
`;

    //console.log(query);
    const result = await prisma.$queryRawUnsafe(query);
    //console.log(result);

    const resultMap = new Map();
    result.forEach((obj) => {
      resultMap.set(obj.item_uuid, { tip_count: obj.tip_count, similar_count: obj.similar_count });
    })
    console.log(resultMap);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(Object.fromEntries(resultMap))
    };
  } catch (error) {
    console.error("Error calling loadItemsCounts API", error);
    return {
      statusCode: 403,
      body: "Error calling loadItemsCounts API"
    };
  } finally {
    await prisma.$disconnect();
  }
};
