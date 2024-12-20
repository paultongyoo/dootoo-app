import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI();

export const handler = async (event) => {

  try {

    // Decode the base64-encoded audio data (event.body)
    let fileBuffer;
    console.log("Event object: " + JSON.stringify(event));
    if (event.isBase64Encoded) {
      console.log("Event is encoded base 64");
      fileBuffer = Buffer.from(event.body, 'base64');
    } else {
      console.log("Event is NOT encoded base 64");
      fileBuffer = Buffer.from(event.body);
    }

    // Hacky way to pass filename that has correct audio file extension (content-type needs to specify m4a, mp4, etc)
    var hackFilename = event.headers["content-type"].replace("/", ".");
    console.log("Hack Filename: " + hackFilename);
    const convertedFile = await toFile(fileBuffer, hackFilename);

    const transcription = await openai.audio.transcriptions.create({
      file: convertedFile,
      model: "whisper-1",
    });

    var transcribedText = transcription.text;
    //console.log("Transcribed Text: " + transcribedText);  // NEVER TRANSCRIBE TEXT INTO LOG FILES TO STAY TRUE TO CUSTOMERS

    // Run transcribed text through moderation API -- if flagged, do not split into tasks and instead report back to user
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: transcribedText
    });

    var flagged = moderation.results[0].flagged;
    console.log("Text Input Flagged by Moderation API? ", moderation.results[0].flagged);
    if (flagged) {
      return {
        statusCode: 200,
        body: "flagged"
      };
    }

    // Note: Lambda lowercases all header keys
    let currentDateStringPrompt = '';
    const userLocalTime = event.headers['userlocaltime'];
    const userTimeZone = event.headers['usertimezone'];
    const utcDateTime = event.headers['utcdatetime'];
    let durationSeconds = event.headers['durationseconds'];
    console.log("All Headers: " + JSON.stringify(event.headers));
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
                Your role is to identify the main tasks and sub-tasks described in the user's input.
                Only consider a task as a sub-task if it is described as part of another task.
                If user cites date and/or time information within a task, remove the date/time info from the task and cite it in the scheduled_datetime_utc field below.
                If only time mentioned in the task, assume scheduled date is the current date in the user's timezone.
                If only date mentioned in the task, assume scheduled time is 12:00AM in the user's timezone.
                Do NOT guess tasks beyond what the user stays in their input.
                Respond only in English.
                Return your analysis in the following JSON format:
                {
                  "tasks": [
                    {
                      "uuid": "<RFC-compliant UUID>",
                      "text": "<task name>", 
                      "parent_item_uuid": <UUID of parent task if this is a subtask>,
                      "scheduled_datetime_utc": <ISO 8601 formatted string in UTC timezone per rules above, or null if no date or time info provided>
                  ]
                }`
        },
        { "role": "user", "content": `User-provided input: ${transcribedText}` }
      ], 
      response_format: { "type": "json_object" },
      user: event.headers['anonymous_id']
    });

    var object_from_chat = JSON.parse(completion.choices[0].message.content);
    var item_array = object_from_chat.tasks;

    let audioCost = 0;
    if (durationSeconds) {
      durationSeconds = Number(durationSeconds);
      audioCost = (durationSeconds / 60) * 0.006;
      console.log("Audio Cost: " + audioCost);
    } else {
      console.log("Audio transcription costs not included yet.");
    }

    const usage = completion.usage;
    const inputTokens = usage.prompt_tokens;
    const inputCost = inputTokens * (0.15 / 1000000);
    const outputTokens = usage.completion_tokens;
    const outputCost = outputTokens * (0.60 / 1000000);
    const chatCost = inputCost + outputCost;
    console.log("Chat Input Tokens: " + inputTokens);
    console.log("Chat Output Tokens: " + outputTokens);
    console.log("Chat Usage cost: $" + chatCost);

    console.log("Total AI Cost: " + audioCost + chatCost);

    //console.log("Final Output: ", item_array);        DO NOT TRANSCRIBE ITEMS TO LOGS TO RESPECT USER PRIVACY

    const response = {
      statusCode: 200,
      body: JSON.stringify(item_array),
      headers: {
        "audio_cost" : audioCost,
        "chat_cost" : chatCost
      }
    };
    return response;
  } catch (error) {
    console.error("Unexpected error occurred: " + JSON.stringify(error));
    console.error("Error message:", error.message); // Basic error message
    console.error("Error stack trace:", error.stack); // Full stack trace
    console.error("Full error object:", error); // Log the complete error object
    return {
      statusCode: 500,
      body: "Unexpected error occurred: " + JSON.stringify(error)
    };
  }
};