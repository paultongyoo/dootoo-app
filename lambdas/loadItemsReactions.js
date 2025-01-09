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

    const items = await prisma.item.findMany({
      where: {
        uuid: {
          in: itemUUIDs,
        }
      },
      select: {
        uuid: true,
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
        }
      }
    });
    console.log(items);
    if (items.length != itemUUIDs.length) {
      const message = `Found mismatch of returned itemData (${items.length}) and itemUUIDs (${itemUUIDs.length}) - exitting!`;
      console.log(message);
      return {
        statusCode: 403,
        body: message
      }
    }

    const resultMap = new Map();
    items.forEach((item) => {
      resultMap.set(item.uuid, item.userReactions);
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
    console.error("Error calling loadItemReactions API", error);
    return {
      statusCode: 403,
      body: "Error calling loadItemReactions API"
    };
  } finally {
    await prisma.$disconnect();
  }
};
