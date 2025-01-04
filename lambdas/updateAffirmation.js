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

    // If affirmation is non-blank, evaluate it.  If it's blank, assume the caller wants to clear the affirmation.
    if (event.affirmation && event.affirmation.length == 0) {

      const moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: event.affirmation
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
              My app is prompting the user to enter an affirmation, advice, or personal motto.  
              Return a JSON object in the following format: 
                { 
                  valid: <boolean 'true' if the user's input meets the criteria above, 'false' otherwise>,
                  reason: <if the input contains words that would be flagged by the OpenAI moderation API, set this to 'moderation'.  
                           if the input appears to sell or promote services, set this to 'spam'.
                           otherwise set this field to with a casual explanation for deeming the input invalid               
                }
              `
          },
          { "role": "user", "content": `User-provided input: ${event.affirmation}` }
        ],
        response_format: { "type": "json_object" },
        user: loadedUser.anonymous_id
      });
      const object_from_chat = JSON.parse(completion.choices[0].message.content);
      if (!object_from_chat.valid) {
        if (object_from_chat.reason == 'moderation') {
          return {
            statusCode: 422,
            body: "Affirmation failed moderation test #2"
          }
        } else if (object_from_chat.reason == 'spam') {
          return {
            statusCode: 423,
            body: "Affirmation failed spamming rules"
          }
        } else {
          return {
            statusCode: 424,
            body: object_from_chat.reason
          }
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: loadedUser.id },
      data: { affirmation: event.affirmation }
    });
    console.log("updatedUser: " + JSON.stringify(updatedUser));

    return {
      statusCode: 200
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


