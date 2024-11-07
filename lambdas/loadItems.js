import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();

export const handler = async (event) => {
    const user = await prisma.user.findUnique({
        where: { anonymous_id: event.anonymous_id}
    });
    console.log(user);
    const retrievedItems = await prisma.item.findMany({
        where: { 
            user: { id: user.id },
            is_deleted: false
        },
        orderBy: {
          rank_idx: 'asc'
        }
    });

    for (var i = 0; i < retrievedItems.length; i++) {
      const item = retrievedItems[i];

      try {

        // Decrypt item text
        const decryptParams = {
          CiphertextBlob: Buffer.from(item.text, 'base64')
        };
        const decryptedData = await kms.decrypt(decryptParams).promise();
        const decryptedString = decryptedData.Plaintext.toString('utf-8');
        item.text = decryptedString;   // Replace with plaintext string for display in app

        // Obtain embedding for item text
        console.log(`Begin count of similar items to item ${item.id}...`);
        const embedding_response = await axios.post(
            "http://ip-172-31-28-150.us-east-2.compute.internal:8000/embed",
            { text: item.text }
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

        // If item is done, return count of your tips for item
        // If item is not done, return count of tips on similar items
        if (item.is_done) {
          const tipCount = await prisma.tip.count({
              where: { 
                  item: {
                      id: item.id
                  }
              }
          })
          console.log("Setting tip count of item: " + tipCount);
          retrievedItems[i].tip_count = tipCount;
        } else {

          // Execute query to count how many tips from similar items
          const num_tips_of_close_embeddings = await prisma.$queryRawUnsafe(
            `SELECT COUNT(DISTINCT "Tip".id) FROM "Tip" LEFT JOIN "Item" on "Tip".item_id = "Item".id ` +
            `WHERE "Tip".user_id <> ` + user.id + ` AND 0.4 > embedding <-> '[` + 
            embeddingArray  + `]'::vector;`);

          console.log("Setting tip count of similar items: " + num_tips_of_close_embeddings[0].count);
          retrievedItems[i].tip_count = Number(num_tips_of_close_embeddings[0].count + ''); // Hack workaround to convert BigInt 
        }

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
