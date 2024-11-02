import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const handler = async (event) => {
    try {  

      const newName = event.username;
      const newAnonId = event.anonymous_id;
      console.log("Retrieved username and anonymousId from client: " + newName + " " + newAnonId);
      
      console.log("Saving new user data to disk...");
      await saveUser(newName, newAnonId) 
        .then(async () => {
          await prisma.$disconnect()
        })
        .catch(async (e) => {
          console.error(e)
          await prisma.$disconnect()
        });
      console.log("Save complete.");

      const response = {
        statusCode: 200,
        body: { name: newName, anonymousId: newAnonId },
      };
      return response;
  } catch (e) {
      console.log("Error saving user data", e);
  }
};

const saveUser = async(username, anonymousId) => {
  await prisma.user.create({
    data: {
      name: username,
      anonymous_id : anonymousId
    }
  });
};