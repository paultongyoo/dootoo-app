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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          "role": "system",
          "content": `
                The user is speaking a list of items. Your role is to identify the main tasks and sub-tasks described in their input, ordering each sub-task immediately after its corresponding main task. Only consider a task as a sub-task if it is described as part of another task.
                "Do NOT guess additional items beyond what the user stays in their input.  Respond only in English.  Return your analysis in the following JSON format:
                {
                  "tasks": [
                    {
                      "uuid": "<RFC-compliant UUID>",
                      "text": "<task name>", 
                      "is_child": <false if main task, true otherwise>},
                      "parent_item_uuid": <UUID of parent task if this is a subtask>
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

    console.log("Final Output: ", item_array);

    const response = {
      statusCode: 200,
      body: JSON.stringify(item_array)
    };
    return response;
  } catch (error) {
    console.log("Unexpected error occurred: " + JSON.stringify(error));
  }
};