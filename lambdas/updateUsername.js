import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {

  try {
    var loadedUser = await prisma.user.findUnique({
      where: { anonymous_id: event.anonymous_id }
    });
    if (loadedUser == null) {
      const message = "Couldn't find user for ID: " + event.anonymous_id;
      console.log(message);
      return {
        statusCode: 403,
        body: message
      }
    }
    console.log("User loaded: " + JSON.stringify(loadedUser));
    console.log("Name to write: " + event.name);

    const updatedUser = await prisma.user.update({
      where: { id: loadedUser.id },
      data: { name: event.name }
    });

    console.log("updatedUser: " + JSON.stringify(updatedUser));

    return {
      statusCode: 200,
      body: updatedUser
    };

  } catch (e) {
    console.log("Error loading user data", e);
    console.log("Assuming a unique violation was thrown; returning 409 status code");
    return {
      statusCode: 409,
      body: e.message
    }
  }
};


