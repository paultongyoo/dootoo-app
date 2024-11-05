import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI();

export const handler = async (event) => {

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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {"role": "system", 
        "content": "Input text represents one or more pieces of advice for a task." +
                   "Reply in the following JSON format: { tips: [<array of tip objects of the format { text: '<tip text>' }]"},
      {"role": "user", "content": transcribedText }
    ], response_format: { "type": "json_object" }
  });

  var object_from_chat = JSON.parse(completion.choices[0].message.content);
  var item_array = object_from_chat.tips;

  console.log("Final Output: ", item_array);

  const response = {
    statusCode: 200,
    body: JSON.stringify(item_array)
  };
  return response;
};