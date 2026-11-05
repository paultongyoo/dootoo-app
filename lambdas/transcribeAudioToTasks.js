import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { extractTasks } from "./lib/extractTasks.mjs";

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

    const { tasks: item_array, usage } = await extractTasks({
      client: openai,
      transcript: transcribedText,
      userLocalTime: event.headers['userlocaltime'],
      userTimeZone: event.headers['usertimezone'],
      utcDateTime: event.headers['utcdatetime'],
      anonymousId: event.headers['anonymous_id'],
    });
    let durationSeconds = event.headers['durationseconds'];

    let audioCost = 0;
    if (durationSeconds) {
      durationSeconds = Number(durationSeconds);
      audioCost = (durationSeconds / 60) * 0.006;
      console.log("Audio Cost: " + audioCost);
    } else {
      console.log("Audio transcription costs not included yet.");
    }

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