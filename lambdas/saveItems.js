import axios from 'axios';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();
const ITEMS_KEY_ID = process.env.ITEMS_KEY_ID;

export const handler = async (event) => {
  const user = await saveItems(event.anonymous_id, event.items_str);
  const updatedUser = await refreshUpdatedCounts(user);
  console.log("Returning updatedUser: " + JSON.stringify(updatedUser));
  const response = {
    statusCode: 200,
    body: JSON.stringify(updatedUser)
  };
  await prisma.$disconnect()
  return response;
};

const saveItems = async(anonymous_id, items_str) => {
    var user = null;
    try {
        user = await prisma.user.findUnique({
            where: { anonymous_id: anonymous_id}
        });
        console.log(user);
        if (user == null) {
            console.log(`Anonymous ID ${anonymous_id} not found in DB, aborting save!`);
            return -1;
        }

        var itemSaveCount = 0;
        var items_arr = JSON.parse(items_str);
        for (var i = 0; i < items_arr.length; i++) {
            var array_item = items_arr[i];

            // Encrypt item text before saving
            try {
                // Encrypt the string
                const encryptParams = {
                KeyId: ITEMS_KEY_ID,
                Plaintext: Buffer.from(array_item.item_text)
                };
                const encryptedData = await kms.encrypt(encryptParams).promise();
                const encryptedString = encryptedData.CiphertextBlob.toString('base64');
                console.log("Encrypted Item Text.");

                const item = await prisma.item.upsert({
                    where: { task_id: array_item.task_id},
                    create: { 
                        task_id: array_item.task_id,
                        user: {
                            connect: { id: user.id }
                        },
                        item_text: encryptedString,
                        is_child: array_item.is_child,
                        rank_idx: i,
                        is_done: array_item.is_done,
                        is_deleted: array_item.is_deleted 
                    },
                    update: { 
                        task_id: array_item.task_id,
                        user: {
                            connect: { id: user.id }
                        },
                        item_text: encryptedString,
                        is_child: array_item.is_child,
                        rank_idx: i,
                        is_done: array_item.is_done,
                        is_deleted: array_item.is_deleted
                    }
                });
                console.log(item); 

                // Retrieve embedding for task and insert into table
                console.log(`Begin retrieval and storing of embedding for item ${item.id}...`);
                const embedding_response = await axios.post(
                    "http://ip-172-31-28-150.us-east-2.compute.internal:8000/embed",
                    { text: array_item.item_text }
                );
                const embedding = embedding_response.data.embedding;
                console.log("Embedding: " + embedding);
                const embeddingArray = embedding.join(',');
                console.log("Embedding Array: " + embeddingArray);
                await prisma.$executeRawUnsafe(`UPDATE "Item" SET embedding = '[` + 
                    embeddingArray + `]'::vector WHERE id = ` + item.id + `;`);
                console.log("End retreival and storage complete ..");

                itemSaveCount += 1;
            } catch (error) {
                console.error('Error encrypting or decrypting:', error);
                return null;
            }
        }
    } catch (error) {
        console.error('Unexpected Prisma error', error);
        return null;
    } 
    console.log("Inside saveItems - checking user obj: " + user);
    return user;
}

const refreshUpdatedCounts = async(loadedUser) => {
    console.log("User loaded: " + JSON.stringify(loadedUser));

    // Count user's completed tasks 
    loadedUser.doneCount = await prisma.item.count({
        where: {
            user: {
                id: loadedUser.id
            },
            is_done: true
        }
    });
    console.log("User Task Done Count: " + loadedUser.doneCount);

    // TODO: Count user's tips
    
    return loadedUser;
}
