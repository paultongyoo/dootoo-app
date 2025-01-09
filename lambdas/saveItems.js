import axios from 'axios';

import OpenAI from "openai";
const openai = new OpenAI();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();
const ITEMS_KEY_ID = process.env.ITEMS_KEY_ID;

const lambda = new AWS.Lambda();

export const handler = async (event) => {
    const user = await saveItems(event.anonymous_id, event.items_str);
    const updatedUser = null;
    if (!event.skipUserLoad) {
        updatedUser = await refreshUpdatedCounts(user);
    }
    var updatedItems = [];
    if (!event.skipLoad) {
        updatedItems = await loadItems(event.anonymous_id);
    }
    const response = {
        statusCode: 200,
        body: JSON.stringify({ user: updatedUser, items: updatedItems })
    };
    await prisma.$disconnect()
    return response;
};

const saveItems = async (anonymous_id, items_str) => {
    var user = null;
    try {
        user = await prisma.user.findUnique({
            where: { anonymous_id: anonymous_id }
        });
        //console.log(user);
        if (user == null) {
            console.log(`Anonymous ID ${anonymous_id} not found in DB, aborting save!`);
            return -1;
        }

        var itemSaveCount = 0;
        var items_arr = JSON.parse(items_str);
        const flaggedItems = [];
        for (var i = 0; i < items_arr.length; i++) {
            var array_item = items_arr[i];

            // TODO:  Improve this moderation UX in future
            const moderation = await openai.moderations.create({
                model: "omni-moderation-latest",
                input: array_item.text
            });
            const flagged = moderation.results[0].flagged;
            if (flagged) {
                flaggedItems.push({ uuid: array_item.uuid, reason: 'moderation' });
                continue;
            }

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        "role": "system",
                        "content": `
                          Validate that the user input is not random characters.
                          Return your analysis in the following JSON format:
                          {
                            invalid: <true if random characters, false otherwise>
                          }`
                    },
                    { "role": "user", "content": `User-provided input: ${array_item.text}` }
                ],
                response_format: { "type": "json_object" },
                user: anonymous_id
            });
            var validationAnalysis = JSON.parse(completion.choices[0].message.content);
            //console.log("validationAnalysis: " + JSON.stringify(validationAnalysis));
            if (validationAnalysis.invalid) {
                console.log("Pushing record to flaggedItems and skipping upsert: " + array_item.uuid);
                flaggedItems.push({ uuid: array_item.uuid, reason: 'random_characters' });
                continue;
            }

            // Encrypt item text before saving
            try {
                // Encrypt the string
                const encryptParams = {
                    KeyId: ITEMS_KEY_ID,
                    Plaintext: Buffer.from(array_item.text)
                };
                const encryptedData = await kms.encrypt(encryptParams).promise();
                const encryptedString = encryptedData.CiphertextBlob.toString('base64');
                //console.log("Encrypted Item Text.");

                const item = await prisma.item.upsert({
                    where: { uuid: array_item.uuid },
                    create: {
                        uuid: array_item.uuid,
                        user: {
                            connect: { id: user.id }
                        },
                        text: encryptedString,
                        is_child: array_item.is_child,  // TODO: Deprecate
                        rank_idx: i,
                        is_done: array_item.is_done,
                        is_deleted: array_item.is_deleted,
                        scheduled_datetime_utc: array_item.scheduled_datetime_utc,
                        event_id: array_item.event_id,
                        ...((array_item.parent_item_uuid) && {
                            parent: {
                                connect: {
                                    uuid: array_item.parent_item_uuid
                                }
                            }
                        })
                    },
                    update: {
                        text: encryptedString,
                        is_child: array_item.is_child,  // TODO: Deprecate
                        rank_idx: i,
                        is_done: array_item.is_done,
                        is_deleted: array_item.is_deleted,
                        scheduled_datetime_utc: array_item.scheduled_datetime_utc,
                        event_id: array_item.event_id,
                        ...((array_item.parent_item_uuid) && {
                            parent: {
                                connect: {
                                    uuid: array_item.parent_item_uuid
                                }
                            }
                        })
                    }
                });
                //console.log("Upserted item: " + JSON.stringify(item));

                // If the item has an open parent and its parent is public,
                // update the parent's public desc and updatedAt
                if (array_item.parent_item_uuid) {
                    const parent = await prisma.item.findUnique({
                        where: {
                            uuid: array_item.parent_item_uuid,
                            is_done: false,
                            is_public: true,
                            is_deleted: false
                        },
                        select: {
                            id: true
                        }
                    });
                    if (parent) {
                        prisma.item.update({
                            where: {
                                id: parent.id
                            },
                            data: {
                                public_update_desc: 'updated',
                                public_updatedAt: new Date()
                            }
                        })
                    }
                }

                // Retrieve embedding for task and insert into table
                //console.log(`Begin retrieval and storing of embedding for item ${item.id}...`);
                const embedding_response = await axios.post(
                    //"http://ip-172-31-31-53.us-east-2.compute.internal:8000/embed",    // PROD EC2 Instance
                    "http://ip-172-31-28-150.us-east-2.compute.internal:8000/embed",    // DEV EC2 Instance
                    { text: array_item.text }
                );
                const embedding = embedding_response.data.embedding;
                //console.log("Embedding: " + embedding);
                const embeddingArray = embedding.join(',');
                //console.log("Embedding Array: " + embeddingArray);
                const query = `UPDATE "Item" SET embedding = '[` +
                    embeddingArray + `]'::vector WHERE id = ` + item.id + `;`
                //console.log("Raw query: " + query);
                await prisma.$executeRawUnsafe(query);
                //console.log("End retreival and storage complete ..");

                itemSaveCount += 1;
            } catch (error) {
                console.error('Error encrypting or decrypting:', error);
                throw new Error('')
            }
        }

        console.log("flaggedItems.length: " + flaggedItems.length);
        if (flaggedItems.length > 0) {
            const flaggedErrorObj = new Error("Flagged Items");
            flaggedErrorObj.flaggedItems = flaggedItems;
            throw flaggedErrorObj;
        }
    } catch (error) {
        console.log("Thrown error message: " + error.message);
        if (error.message == 'Flagged Items') {
            const errorPayload = {
                errorType: error.message,
                flaggedItems: error.flaggedItems
            }
            throw new Error(JSON.stringify(errorPayload));
        } else {
            console.error('Unexpected error occurred during item processing', error);
            return null;
        }
    }
    //console.log("Inside saveItems - checking user obj: " + user);
    return user;
}

const refreshUpdatedCounts = async (loadedUser) => {
    //console.log("User loaded: " + JSON.stringify(loadedUser));

    // Count user's completed tasks 
    loadedUser.doneCount = await prisma.item.count({
        where: {
            user: {
                id: loadedUser.id
            },
            is_done: true
        }
    });
    //console.log("User Task Done Count: " + loadedUser.doneCount);

    // Count user's tips
    loadedUser.tipCount = await prisma.tip.count({
        where: {
            user: {
                id: loadedUser.id
            },
            is_deleted: false
        }
    });
    //console.log("User Tip Count: " + loadedUser.tipCount);

    return loadedUser;
}

const loadItems = async (anonymous_id) => {
    const lambdaParams = {
        FunctionName: "loadItems_Dev:prod",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ anonymous_id: anonymous_id, loadAll: true })
    };

    try {
        const response = await lambda.invoke(lambdaParams).promise();
        const latestItems = JSON.parse(response.Payload).body;
        //console.log("Number of updated items: " + updatedItems.length);
        return latestItems;
    } catch (error) {
        console.error("Error invoking Lambda function:", error);
        throw error;
    }
}
