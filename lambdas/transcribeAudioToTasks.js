import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { v4 as uuidv4 } from 'uuid';

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
                   "Reply in the following JSON format: { tasks: [<array of task objects of the format { item_text: '<task name>', is_child: <false if task is main task, true otherwise>}]"},
      {"role": "user", "content": transcribedText }
    ], response_format: { "type": "json_object" }
  });

  var object_from_chat = JSON.parse(completion.choices[0].message.content);
  var item_array = object_from_chat.tasks;
  for (var i = 0; i < item_array.length; i++) {
    const item = item_array[i];

    item.task_id = uuidv4();

    // Obtain embedding for item text
    console.log(`Begin retrieval and storing of embedding for recorded item ...`);
    const embedding_response = await axios.post(
        "http://ip-172-31-28-150.us-east-2.compute.internal:8000/embed",
        { text: item.item_text }
      );
    const embedding = embedding_response.data.embedding;
    console.log("Embedding: " + embedding);
    const embeddingArray = embedding.join(',');

    // Execute query to count how many similar items
    const num_close_embeddings = await prisma.$queryRawUnsafe(
      `SELECT COUNT(id) FROM "Item" WHERE 0.4 > embedding <-> '[` + 
      embeddingArray + `]'::vector;`);

    console.log("num close embeddings return: " + num_close_embeddings[0].count);
    // append count to item object
    item_array[i].similar_count = Number(num_close_embeddings[0].count + ''); // Hack workaround to convert BigInt 
    console.log("Updated Item: " + item_array[i]);

  }

  console.log("Final Output: ", item_array);


  const response = {
    statusCode: 200,
    body: JSON.stringify(item_array)
  };
  return response;
};