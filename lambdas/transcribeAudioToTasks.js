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
        "content": "Identify the main tasks and sub tasks described in the input text, ordering each sub task after each main task in the list. "  +
                   "Only identify a task as a sub task if the input refers to the task as part of another task.  " +
                   "Reply in the following JSON format: { tasks: [<array of task objects of the format { item_text: '<task name>', is_child: <false if task is main task, true otherwise>}}"},
      {"role": "user", "content": transcribedText }
    ], response_format: { "type": "json_object" }
  });
  console.log("Chat Completion Output: ", completion.choices[0].message.content);

  const response = {
    statusCode: 200,
    body: completion.choices[0].message.content
  };
  return response;
};