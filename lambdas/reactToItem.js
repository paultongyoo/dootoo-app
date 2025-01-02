import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {

  try {
    const user = await prisma.user.findUnique({
      where: { anonymous_id: event.anonymous_id }
    });
    if (!user) {
      await prisma.$disconnect()
      return {
        statusCode: 403,
        body: false
      };
    }

    const item = await prisma.item.findUnique({
      where: { uuid: event.item_uuid }
    });
    if (!item) {
      await prisma.$disconnect()
      return {
        statusCode: 403,
        body: false
      };
    }

    const reaction = await prisma.reaction.findUnique({
      where: { name: event.reaction }
    });
    if (!reaction) {
      await prisma.$disconnect()
      return {
        statusCode: 403,
        body: false
      };
    }

    if (event.delete) {
      const deletedReaction = await prisma.userReaction.delete({
        where: {
          user_id_item_id_reaction_id: {
            user_id: user.id,        
            item_id: item.id,       
            reaction_id: reaction.id   
          }
        }
      });
      if (deletedReaction) {
        console.log('Reaction deleted successfully:', deletedReaction);
      } else {
        await prisma.$disconnect()
        return {
          statusCode: 403,
          body: false
        };
      }
    } else {
      const newReaction = await prisma.userReaction.create({
        data: {
          user_id: user.id,
          item_id: item.id,
          reaction_id: reaction.id
        },
      });
      console.log('Reaction created successfully:', newReaction);
    }

    await prisma.$disconnect()
    return {
      statusCode: 200,
      body: true
    };
  } catch (e) {
    console.log("Error reacting to item", e);
    return {
      statusCode: 403,
      body: false
    };
  }
};


