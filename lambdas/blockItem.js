import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {

  try {

    console.log("Loading user for anonymous Id: " + event.anonymous_id);
    const blockingUser = await prisma.user.findUnique({
      where: { anonymous_id: event.anonymous_id }
    });
    if (!blockingUser) {
      await prisma.$disconnect()
      return {
        statusCode: 403,
        body: false
      };
    }

    const itemToBlock = await prisma.item.findUnique({
      where: { uuid: event.item_uuid }
    });
    if (!itemToBlock) {
      await prisma.$disconnect()
      return {
        statusCode: 403,
        body: false
      };
    }

    const newBlock = await prisma.itemBlock.create({
      data: {
        blocking_user_id: blockingUser.id,
        blocked_item_id: itemToBlock.id,
        reason: event.reason
      },
    });

    console.log('ItemBlock created successfully:', newBlock);

    await prisma.$disconnect()
    return {
      statusCode: 200,
      body: true
    };
  } catch (e) {
    console.log("Error blocking item data", e);
    return {
      statusCode: 403,
      body: false
    };
  }
};


