import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const handler = async (event) => {
    try {  

      const newName = event.username;
      const newAnonId = event.anonymous_id;
      console.log("Retrieved username and anonymousId from client: " + newName + " " + newAnonId);
      
      console.log("Saving new user data to disk...");
      const newUser = await saveUser(newName, newAnonId);
      console.log(`Saved new user to DB: ${JSON.stringify(newUser)}.`);

      const response = {
        statusCode: 200,
        body: newUser
      };
      await prisma.$disconnect();
      return response;
  } catch (e) {
      console.log("Error saving user data", e);
      await prisma.$disconnect();
  }
};

const saveUser = async(username, anonymousId) => {
  return await prisma.user.create({
    data: {
      name: username,
      anonymous_id : anonymousId
    }
  });
};