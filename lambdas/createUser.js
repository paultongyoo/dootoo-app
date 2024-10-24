import { v4 as uuidv4 } from 'uuid';
import { uniqueNamesGenerator, adjectives, animals, NumberDictionary } from 'unique-names-generator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const handler = async (event) => {
  
  // Creates new user and anonymous ID and returns back to client
  try {  

      const newName = generateUsername();
      console.log(`Username created ${newName}`);
      const newAnonId = uuidv4();
      console.log(`Anon ID created ${newAnonId}`);
      
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
      console.log("Error generating or saving user data", e);
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

const generateUsername = () => {
  const numberDictionary = NumberDictionary.generate({ min: 100, max: 999 });
  const characterName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals, numberDictionary],
      length: 3,
      separator: '',
      style: 'capital'
    });
  return characterName;
};
