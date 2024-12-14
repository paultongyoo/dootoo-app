import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import OpenAI from "openai";
const openai = new OpenAI();

export const handler = async (event) => {

  try {
    const user = await prisma.user.findUnique({
      where: { anonymous_id: event.anonymous_id }
    });
    if (user == null) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Can\'t find user!' })
        };
    }

    const item = JSON.parse(event.item_str);

    // Run text through moderation API 
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: item.text
    });

    var flagged = moderation.results[0].flagged;
    console.log("Text Input Flagged by Moderation API? ", moderation.results[0].flagged);
    if (flagged) {
      return {
        statusCode: 200,
        body: { text: '(flagged)' }
      };
    }

    // Note: Lambda lowercases all header keys
    let currentDateStringPrompt = '';
    const userLocalTime = event.headers['userlocaltime'];
    const userTimeZone = event.headers['usertimezone'];
    const utcDateTime = event.headers['utcdatetime'];
    console.log("All Headers: " + JSON.stringify(event.headers));
    if (userLocalTime && userTimeZone && utcDateTime) {
      currentDateStringPrompt = `The user's current local date and time is ${userLocalTime} (timezone: ${userTimeZone}). The current UTC time is ${utcDateTime}.`;
      console.log("Generated date/time string: " + currentDateStringPrompt);
    } else {
      console.log(`Skipping date/time prompt generation as we're missing one or more components: userLocalTime (${userLocalTime}) userTimeZone (${userTimeZone}) utcDateTime (${utcDateTime})`);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          "role": "system",
          "content": `
                ${currentDateStringPrompt}
                The user has submitted a description of a task.
                If the user cites date and/or time information within the task, remove referral to the date/time from the task and cite it in the scheduled_datetime_utc field below.
                If they only mention a time in their task, assume the scheduled date is the current date in the user's timezone.
                If they only mention a date in their task, assume the scheduled time is 12:00AM in the user's timezone.
                Respond only in English.
                Return your analysis in the following JSON format:
                {
                  "text": "<modified task description if it contained date and/or time info, otherwise return unmodified task>", 
                  "scheduled_datetime_utc": <ISO 8601 formatted string in UTC timezone per rules above, or null if no date or time info provided>
                }`
        },
        { "role": "user", "content": `User-provided input: ${item.text}` }
      ], 
      response_format: { "type": "json_object" },
      user: event.headers['anonymous_id']
    });

    const enrichedItem = JSON.parse(completion.choices[0].message.content);

    const response = {
      statusCode: 200,
      body: enrichedItem
    };
    return response;
  } catch (error) {
    console.log("Unexpected error occurred: " + JSON.stringify(error));
    return {
      statusCode: 500,
      body: "Unexpected error occurred: " + JSON.stringify(error)
    };
  }
};