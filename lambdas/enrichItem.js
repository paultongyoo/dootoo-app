import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import OpenAI from "openai";
const openai = new OpenAI();
import AWS from 'aws-sdk';
const kms = new AWS.KMS();

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

    // Note: Lambda lowercases all header keys
    let currentDateStringPrompt = '';
    const userLocalTime = event.userlocaltime;
    const userTimeZone = event.usertimezone;
    const utcDateTime = event.utcdatetime;
    if (userLocalTime && userTimeZone && utcDateTime) {
      currentDateStringPrompt = `The user's current local date and time is ${userLocalTime} (timezone: ${userTimeZone}). The current UTC time is ${utcDateTime}.`;
      console.log("Generated date/time string: " + currentDateStringPrompt);
    } else {
      console.log(`Skipping date/time prompt generation as we're missing one or more components: userLocalTime (${userLocalTime}) userTimeZone (${userTimeZone}) utcDateTime (${utcDateTime})`);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          "role": "system",
          "content": `
                ${currentDateStringPrompt}
                The user has submitted a description of a task.
                If the task includes time, date, and/or temporal adverb information, translate the info into the scheduled_datetime_utc field below.
                If the task only contains time info, assume the date is the current date in the user's timezone.
                If the task only contains a date or temporal adverbs, assume the time is 6:00AM in the user's timezone.
                Respond only in English.
                Return your analysis in the following JSON format:
                {
                  "scheduled_datetime_utc": <ISO 8601 formatted string in UTC timezone per rules above if task contained time info, otherwise set to null>
                }`
        },
        { "role": "user", "content": `User-provided input: ${event.text}` }
      ], 
      response_format: { "type": "json_object" },
      user: event.anonymous_id
    });

    const { scheduled_datetime_utc } = JSON.parse(completion.choices[0].message.content);

    const usage = completion.usage;
    const inputTokens = usage.prompt_tokens;
    const inputCost = inputTokens * (0.15 / 1000000);
    const outputTokens = usage.completion_tokens;
    const outputCost = outputTokens * (0.60 / 1000000);
    const chatCost = inputCost + outputCost;
    console.log("Chat Input Tokens: " + inputTokens);
    console.log("Chat Output Tokens: " + outputTokens);
    console.log("Chat Usage cost: $" + chatCost);

    console.log("Total AI Cost: " + chatCost);

    const response = {
      statusCode: 200,
      body: { scheduled_datetime_utc, chat_cost: chatCost }
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