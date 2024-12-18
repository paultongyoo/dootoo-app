import Busboy from "@fastify/busboy";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI();

export const handler = async (event) => {

  try {

    // Verify the event is multipart/form-data
    console.log("Checking content type...");
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType.startsWith('multipart/form-data')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unsupported content type' }),
      };
    }

    // Parse the multipart data
    console.log("Initializing Busboy ...");
    const busboy = new Busboy({ headers: { 'content-type': contentType } });

    let fileBuffer;
    let fileName;
    let fileType;
    let abridgedItems;
    let anonymousId;
    let userLocalTime;
    let userTimeZone;
    let utcDateTime;
    let durationSeconds;

    // Process each part of the form
    console.log("Executing Busboy promise...");
    await new Promise((resolve, reject) => {
      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log("Attempting to parse file...");
        fileName = filename;
        fileType = mimetype;

        // Collect the file data into a buffer
        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      busboy.on('field', (fieldname, value) => {

        // ONLY UNCOMMENT FOR DEBUGGING PURPOSES, do NOT expose abridged items in logs
        //console.log("Attempting to parse field: " + fieldname + ", value: " + value);

        if (fieldname === 'items_str') {
          abridgedItems = JSON.parse(value); // Parse the JSON string
        }
        if (fieldname === 'anonymousId') {
          anonymousId = JSON.parse(value); // Parse the JSON string
        }
        if (fieldname === 'userLocalTime') {
          userLocalTime = JSON.parse(value); // Parse the JSON string
        }
        if (fieldname === 'userTimeZone') {
          userTimeZone = JSON.parse(value); // Parse the JSON string
        }
        if (fieldname === 'utcDateTime') {
          utcDateTime = JSON.parse(value); // Parse the JSON string
        }
        if (fieldname === 'durationSeconds') {
          durationSeconds = JSON.parse(value); // Parse the JSON string
        }
      });

      busboy.on('finish', resolve);
      busboy.on('error', reject);

      busboy.end(Buffer.from(event.body, 'base64')); // Lambda provides the body in base64 encoding
    });

    if (abridgedItems) {
      if (abridgedItems) {
        console.log("Number of abridged items submitted: " + abridgedItems.length);
      } else {
        console.log("Could not parse provided items string.");
      }
    }
    console.log("Busboy promise completed executing.");

    console.log("Filename: " + fileName);
    const convertedFile = await toFile(fileBuffer, fileName);

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
                The user is speaking a new list of tasks and may optionally provide a json array of
                item objects representing their pre-existing list of tasks.
                Your role is to identify the main tasks and sub-tasks described in their input, 
                ordering each sub-task immediately after its corresponding main task.
                Only consider a task as a sub-task if it is described as part of another task.
                If the user cites date and/or time information within a task, remove referral to the date/time from the task and cite it in the scheduled_datetime_utc field below.
                If they only mention a time in their task, assume the scheduled date is the current date in the user's timezone.
                If they only mention a date in their task, assume the scheduled time is 12:00AM in the user's timezone.             
                Do NOT guess additional items beyond what the user stays in their input.
                Respond only in English.

                If the user provided their pre-existing tasks: For each task in their new list, if it is stated to relate 
                to a pre-existing task, return a merged list of their pre-existing and new list of tasks, inserting the new task(s) as subtasks
                of the corresponding pre-existing tasks (or sibling tasks of the same parent, if the related pre-existing task is already a subtask).
                
                If the new items are unrelated to the pre-existing list of tasks, just return the new tasks.
                
                Return your analysis in the following JSON format:
                {
                  "wereListsMerged: <true if new and pre-existing lists were merged, false otherwise>,
                  "tasks": [
                    {
                      "uuid": "<RFC-compliant UUID>",
                      "text": "<task name>", 
                      "is_child": <false if main task, true otherwise>},
                      "parent_item_uuid": <UUID of parent task if this is a subtask>,
                      "scheduled_datetime_utc": <ISO 8601 formatted string in UTC timezone per rules above, or null if no date or time info provided>
                  ]
                }`
        },
        { "role": "user", "content": `User-provided pre-existing list: ${JSON.stringify(abridgedItems)}
                                      User-provided new list: ${transcribedText}` }
      ],
      response_format: { "type": "json_object" },
      user: anonymousId
    });

    var chat_reseponse_obj = JSON.parse(completion.choices[0].message.content);

    const audioCost = (durationSeconds / 60.0) * 0.006;
    console.log("Audio Usage cost: $" + audioCost + " (" + (durationSeconds / 60.0) + " min)");

    const usage = completion.usage;
    const inputTokens = usage.prompt_tokens;
    const inputCost = inputTokens * (0.15 / 1000000);
    const outputTokens = usage.completion_tokens;
    const outputCost = outputTokens * (0.60 / 1000000);
    const chatCost = inputCost + outputCost;
    console.log("Chat Usage cost: $" + chatCost);

    console.log("Total AI Cost: " + audioCost + chatCost);

    //console.log("Final Output: ", item_array);        DO NOT TRANSCRIBE ITEMS TO LOGS TO RESPECT USER PRIVACY

    const response = {
      statusCode: 200,
      body: JSON.stringify(chat_reseponse_obj)
    };

    return response;
  } catch (error) {
    console.error("Unexpected error occurred: " + JSON.stringify(error));
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    return {
      statusCode: 500,
      body: "Unexpected error occurred: " + JSON.stringify(error)
    };
  }
};