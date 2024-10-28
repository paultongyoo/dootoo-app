import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();
const ITEMS_KEY_ID = process.env.ITEMS_KEY_ID;

export const handler = async (event) => {
    const user = await prisma.user.findUnique({
        where: { anonymous_id: event.anonymous_id}
    });
    console.log(user);
    const retrievedItems = await prisma.item.findMany({
        where: { 
            user: { id: user.id }
        }
    });

    for (var i = 0; i < retrievedItems.length; i++) {
      const item = retrievedItems[i];

      try {

        // Decrypt item text
        const decryptParams = {
          CiphertextBlob: Buffer.from(item.item_text, 'base64')
        };
        const decryptedData = await kms.decrypt(decryptParams).promise();
        const decryptedString = decryptedData.Plaintext.toString('utf-8');
        item.item_text = decryptedString;   // Replace with plaintext string for display in app

        // Obtain embedding for item text
        console.log(`Begin count of similar items to item ${item.id}...`);
        const embedding_response = await axios.post(
            "http://ip-172-31-28-150.us-east-2.compute.internal:8000/embed",
            { text: item.item_text }
          );
        const embedding = embedding_response.data.embedding;
        console.log("Embedding: " + embedding);
        const embeddingArray = embedding.join(',');

        // Execute query to count how many similar items
        const num_close_embeddings = await prisma.$queryRawUnsafe(
          `SELECT COUNT(DISTINCT user_id) FROM "Item" WHERE id <> ` + item.id + ` AND 0.4 > embedding <-> '[` + 
        embeddingArray + `]'::vector AND user_id <> ` + user.id + `;`);

        console.log("num close embeddings return: " + num_close_embeddings[0].count);
        // append count to item object
        retrievedItems[i].similar_count = Number(num_close_embeddings[0].count + ''); // Hack workaround to convert BigInt 
        console.log("Updated Item: " + retrievedItems[i]);

      } catch (error) {
        console.error('Error encrypting or decrypting:', error);
        return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Encryption/Decryption failed' })
        };
      }
    }
    const response = {
      statusCode: 200,
      body: JSON.stringify(retrievedItems)
    };
    console.log("Response returned: " + retrievedItems);
    await prisma.$disconnect();
    return response;
};
