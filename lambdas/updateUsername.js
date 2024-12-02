import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import OpenAI from "openai";
const openai = new OpenAI();

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

    const dupeUser = await prisma.user.findFirst({
      where: {
        name: {
          equals: event.name,
          mode: 'insensitive'
        }
      }
    });
    if (dupeUser) {
      return {
        statusCode: 409,
        body: "Username already exists"
      }
    }

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: event.name
    });
    const flagged = moderation.results[0].flagged;
    if (flagged) {
      return {
        statusCode: 422,
        body: "Username failed moderation test #1"
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          "role": "system",
          "content": `
              The user is changing their username.  
              Check that the username does not appear to sell or promote services.
              Check that the username does not contain any words that would be flagged by the OpenAI moderation API.
              Return a JSON object in the following format: 
                { 
                  valid: <boolean 'true' if username does not violate the above rules, 'false' otherwise>,
                  reason: <if username contains words that would be flagged by the OpenAI moderation API, set this to 'moderation'.  
                           if username appears to sell or promote services, set this to 'spam'.
                           otherwise set field to null value                
                }
              `
        },
        { "role": "user", "content": `User-provided input: ${event.name}` }
      ], response_format: { "type": "json_object" }
    });
    const object_from_chat = JSON.parse(completion.choices[0].message.content);
    if (!object_from_chat.valid) {
      if (object_from_chat.reason == 'moderation') {
        return {
          statusCode: 422,
          body: "Username failed moderation test #2"
        }
      } else {
        return {
          statusCode: 423,
          body: "Username failed spamming rules"
        }
      }
    }

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
    return {
      statusCode: 403,
      body: e.message
    }
  } finally {
    await prisma.$disconnect();
  }
};


