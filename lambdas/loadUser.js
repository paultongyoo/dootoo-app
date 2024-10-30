import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
  
  // Loads user and its counts and returns them back to client
  try {  
      
      console.log("Loading user for anonymous Id: " + event.anonymous_id);
      const loadedUser = await prisma.user.findUnique({
        where: { anonymous_id: event.anonymous_id}
      });
      if (loadedUser != null) {
        console.log("User loaded: " + JSON.stringify(loadedUser));

        // Count user's created tasks (deleted + non_deleted)
        loadedUser.taskCount = await prisma.item.count({
          where: {
              user: {
                  id: loadedUser.id
              }
          }
        });
        console.log("User Task Count: " + loadedUser.taskCount);
        
        // Count user's completed tasks 
        loadedUser.doneCount = await prisma.item_Done.count({
          where: {
              user: {
                  id: loadedUser.id
              }
          }
        });
        console.log("User Task Done Count: " + loadedUser.doneCount);

        await prisma.$disconnect()
        return {
          statusCode: 200,
          body: { 
            name: loadedUser.name, 
            anonymousId: loadedUser.anonymous_id,
            taskCount: loadedUser.taskCount,
            doneCount: loadedUser.doneCount
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
      console.log("Error generating or saving user data", e);
  }
};


