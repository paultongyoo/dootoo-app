import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { v4 as uuidv4 } from 'uuid';
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
    console.log("Transcribed Text: " + transcribedText);

    // Run transcribed text through moderation API -- if flagged, do not split into tasks and instead report back to user
    const moderation = await openai.moderations.create({
      mdeol: "omni-moderation-latest",
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {"role": "system", 
          "content": "Input text contains one or pieces of advice." +
                    "Reply in the following JSON format: { tips: [<array of objects of the format { text: '<advice (do NOT add words or embellish)>' }]"},
        {"role": "user", "content": transcribedText }
      ], response_format: { "type": "json_object" }
    });

    var object_from_chat = JSON.parse(completion.choices[0].message.content);
    var tip_array = object_from_chat.tips;

    for (var i = 0; i < tip_array.length; i++) {
      const tip = tip_array[i];
      tip.uuid = uuidv4();
    }

    console.log("Final Output: ", tip_array);

    const response = {
      statusCode: 200,
      body: JSON.stringify(tip_array)
    };
    return response;
  } catch (error) {
    console.log("Error occurred transcribing the tips!", error);
    const response = {
      statusCode: 500,
      body: JSON.stringify(error)
    };
    return response;
  } 
};