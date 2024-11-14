import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
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
                You are given a user-provided description of tasks. Your role is to identify the main tasks and sub-tasks described in this user-provided content, ordering each sub-task immediately after its corresponding main task. Only consider a task as a sub-task if it is described as part of another task.
                The user-provided description of tasks is below. Please return your analysis in the following JSON format:
                {
                  "tasks": [
                    {"text": "<task name>", "is_child": <false if main task, true otherwise>}
                  ]
                }`
        },
        { "role": "user", "content": `User-provided content: ${transcribedText}`}
      ], response_format: { "type": "json_object" }
    });

    var object_from_chat = JSON.parse(completion.choices[0].message.content);
    var item_array = object_from_chat.tasks;

    // Retrieve user id to filter out similar tasks from same user
    console.log("Attempting user ID lookup for anonymous_id: " + event.headers.anonymous_id);
    const user = await prisma.user.findUnique({
      where: { anonymous_id: event.headers.anonymous_id }
    });
    console.log(user);
    if (user) {
      for (var i = 0; i < item_array.length; i++) {
        const item = item_array[i];

        item.uuid = uuidv4();

        // Obtain embedding for item text
        console.log(`Begin retrieval and storing of embedding for recorded item ...`);
        const embedding_response = await axios.post(
          //"http://ip-172-31-31-53.us-east-2.compute.internal:8000/embed",    // PROD EC2 Instance
          "http://ip-172-31-28-150.us-east-2.compute.internal:8000/embed",    // DEV EC2 Instance
          { text: item.text }
        );
        const embedding = embedding_response.data.embedding;
        console.log("Embedding: " + embedding);
        const embeddingArray = embedding.join(',');

        // Execute query to count how many similar items
        const num_close_embeddings = await prisma.$queryRawUnsafe(
          `SELECT COUNT(DISTINCT user_id) FROM "Item" WHERE 0.7 >= embedding <-> '[` +
          embeddingArray + `]'::vector AND user_id <> ` + user.id + `;`);

        console.log("num close embeddings return: " + num_close_embeddings[0].count);
        // append count to item object
        item_array[i].similar_count = Number(num_close_embeddings[0].count + ''); // Hack workaround to convert BigInt 
        console.log("Updated Item: " + item_array[i]);
      }
    } else {
      console.log("Could not find user, unexpected!!");
      return {
        statusCode: 500,
        body: 'Could not find user in DB'
      };
    }

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