import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
  //console.log("Event Obj: " + JSON.stringify(event));
  const postBody = JSON.parse(event.body);
  try {
    const user = await prisma.user.findUnique({
      where: { anonymous_id: postBody.anonymous_id }
    });
    if (user == null) {
      return {
        statusCode: 403
      };
    }
    console.log(user);

 
    const click = await prisma.clickStream.create({
      data: {
        anonymous_id: user.anonymous_id,
        username: user.name,
        ip_addr: event.requestContext.identity.sourceIp,
        event_name: postBody.eventName,
        event_properties: postBody.eventProperties
      }
    });
    console.log("Click: " + JSON.stringify(click));
    if (click) {
      const response = {
        statusCode: 200
      };
      return response;
    } else {
      throw new Error()
    }
  } catch (error) {
    console.log("Error occurred attempting to save clickStream:", error);
    return {
      statusCode: 500,
      body: `Error occurred: ${error}`
    }
  } finally {
    await prisma.$disconnect();
  }
}