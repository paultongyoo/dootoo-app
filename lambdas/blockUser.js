import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {

  // Blocks user if blocking and blocked user matches are found
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

    const userToBlock = await prisma.user.findUnique({
      where: { name: event.name }
    });
    if (!userToBlock) {
      await prisma.$disconnect()
      return {
        statusCode: 403,
        body: false
      };
    }

    const newBlock = await prisma.userBlock.create({
      data: {
        blocking_user_id: blockingUser.id,
        blocked_user_id: userToBlock.id,
        reason: event.reason
      },
    });

    console.log('UserBlock created successfully:', newBlock);

    await prisma.$disconnect()
    return {
      statusCode: 200,
      body: true
    };
  } catch (e) {
    console.log("Error blocking user data", e);
    return {
      statusCode: 403,
      body: false
    };
  }
};


