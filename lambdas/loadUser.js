import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {

  // Loads user and its counts and returns them back to client
  try {
    var loadedUser = null;
    if (event.anonymous_id) {
      console.log("Loading user for anonymous Id: " + event.anonymous_id);
      loadedUser = await prisma.user.findUnique({
        where: { anonymous_id: event.anonymous_id }
      });
    } else if (event.name) {
      console.log("Loading user for name: " + event.name);
      loadedUser = await prisma.user.findUnique({
        where: { name: event.name }
      });
    }
    if (loadedUser != null) {
      console.log("User loaded: " + JSON.stringify(loadedUser));

      // Count user's completed tasks 
      loadedUser.doneCount = await prisma.item.count({
        where: {
          user: {
            id: loadedUser.id
          },
          is_done: true
        }
      });
      console.log("User Task Done Count: " + loadedUser.doneCount);

      // Count user's created tasks (deleted + non_deleted)
      loadedUser.tipCount = await prisma.tip.count({
        where: {
          user: {
            id: loadedUser.id
          },
          is_flagged: false
        }
      });
      console.log("User Tip Count: " + loadedUser.tipCount);

      await prisma.$disconnect()
      return {
        statusCode: 200,
        body: {
          name: loadedUser.name,
          doneCount: loadedUser.doneCount,
          tipCount: loadedUser.tipCount
        }
      };
    } else {

      await prisma.$disconnect()
      return {
        statusCode: 403,
        body: "Couldn't find user!"
      };
    }

  } catch (e) {
    console.log("Error loading user data", e);
  }
};


