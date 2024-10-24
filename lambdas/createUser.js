import { v4 as uuidv4 } from 'uuid';
import { uniqueNamesGenerator, adjectives, animals, NumberDictionary } from 'unique-names-generator';
export const handler = async (event) => {
  
  // Creates new user and anonymous ID and returns back to client
  try {  

      const newName = generateUsername();
      console.log(`Username created ${newName}`);
      const newAnonId = uuidv4();
      console.log(`Anon ID created ${newAnonId}`);
      
      // console.log("Saving new user data to disk...");

      // console.log("Save complete.");

      const response = {
        statusCode: 200,
        body: { name: newName, anonymousId: newAnonId },
      };
      return response;
  } catch (e) {
      console.log("Error reading or saving user name", e);
  }
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
