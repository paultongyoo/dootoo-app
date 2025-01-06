import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();
const ITEMS_KEY_ID = process.env.ITEMS_KEY_ID;

import axios from 'axios';

import OpenAI from "openai";
const openai = new OpenAI();

const FLAGGED_STR = '(flagged)';

export const handler = async (event) => {
    try {
        const user = await prisma.user.findUnique({
            where: { anonymous_id: event.anonymous_id }
        });
        if (user == null) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Can\'t find user!' })
            };
        }
        console.log(user);
        const item = await prisma.item.findUnique({
            where: {
                user: { id: user.id },
                uuid: event.item_uuid
            },
            include: { parent: true }   // Include parent in retrieval if one exists for following checkup.
        });
        if (item == null) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Can\'t find item owned by user!' })
            };
        }

        var textUpdate = event.text

        // Confirm text passes moderation
        textUpdate = await moderateText(textUpdate);
        const encryptedText = await encryptText(textUpdate);

        let derived_scheduled_datetime_utc = null;
        let derived_cost = null;
        let updatedItem = null;
        if (textUpdate != FLAGGED_STR) {

            // TODOs:
            // 1) Inspect text for potential schedule enrichment
            // 2) Update item with new text
            // 3) If schedule information found, update item with new schedule
            // 4) If item had an event Id, inform client to update event Id with new schedule

            const { scheduled_datetime_utc, chat_cost } = await evaluateTextForScheduleInfo(textUpdate, event);
            derived_scheduled_datetime_utc = scheduled_datetime_utc;
            derived_cost = chat_cost;

            updatedItem = await prisma.item.update({
                where: { id: item.id },
                data: {
                    text: encryptedText,
                    ...(scheduled_datetime_utc && { scheduled_datetime_utc: scheduled_datetime_utc }),
                    ...(item.is_public && {
                        public_update_desc: 'updated',
                        public_updatedAt: new Date()
                    }),
                    ...(item.parent && item.parent.is_public && {
                        parent: {
                            update: {
                                public_update_desc: 'updated',
                                public_updatedAt: new Date()
                            }
                        }
                    })
                },
                select: {
                    id: true
                }
            });
        } else {
            updatedItem = await prisma.item.update({
                where: { id: item.id },
                data: { text: encryptedText },
                select: { id: true }
            });
        }

        // Update embedding for new text
        await updateItemEmbedding(textUpdate, updatedItem);

        const response = {
            statusCode: 200,
            body: { 
                updatedText: textUpdate,
                scheduled_datetime_utc: derived_scheduled_datetime_utc,
                chat_cost: derived_cost
            }
        };
        return response;
    } catch (error) {
        console.log("Error.name: " + error.name);
        console.log("Error.message: " + error.message);
        console.log("Error.stack: " + error.stack);
        return {
            statusCode: 500,
            body: `Error occurred: ${error}`
        }
    } finally {
        await prisma.$disconnect();
    }
}

async function updateItemEmbedding(textUpdate, updatedItem) {
    const embedding_response = await axios.post(
        //"http://ip-172-31-31-53.us-east-2.compute.internal:8000/embed",    // PROD EC2 Instance
        "http://ip-172-31-28-150.us-east-2.compute.internal:8000/embed", // DEV EC2 Instance
        { text: textUpdate }
    );
    const embedding = embedding_response.data.embedding;
    const embeddingArray = embedding.join(',');
    await prisma.$executeRawUnsafe(
        `UPDATE "Item" SET embedding = '[${embeddingArray}]'::vector 
        WHERE id = ${updatedItem.id};`
    );
}


async function moderateText(textUpdate) {
    const moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: textUpdate
    });
    const flagged = moderation.results[0].flagged;
    if (flagged) {
        textUpdate = FLAGGED_STR;
    }
    return textUpdate;
}

async function encryptText(textUpdate) {
    const encryptParams = {
        KeyId: ITEMS_KEY_ID,
        Plaintext: Buffer.from(textUpdate)
    };
    const encryptedData = await kms.encrypt(encryptParams).promise();
    const encryptedText = encryptedData.CiphertextBlob.toString('base64');
    return encryptedText;
}

async function evaluateTextForScheduleInfo(textUpdate, event) {

    // Note: Lambda lowercases all header keys
    let currentDateStringPrompt = '';
    const userLocalTime = event.userlocaltime;
    const userTimeZone = event.usertimezone;
    const utcDateTime = event.utcdatetime;
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
                 The user has submitted a description of a task.
                 If the task includes time, date, and/or temporal adverb information, translate the info into the scheduled_datetime_utc field below.
                 If the task only contains time info, assume the date is the current date in the user's timezone.
                 If the task only contains a date or temporal adverbs, assume the time is 6:00AM in the user's timezone.
                 Respond in the following JSON format:
                 {
                   "scheduled_datetime_utc": <ISO 8601 formatted string in UTC timezone per rules above if task contains time info, otherwise set field to null>
                 }`
            },
            { "role": "user", "content": `User-provided input: ${textUpdate}` }
        ],
        response_format: { "type": "json_object" },
        user: event.anonymous_id
    });

    console.log("completion.choices[0].message.content: " + JSON.stringify(completion.choices[0].message.content));
    const { scheduled_datetime_utc } = JSON.parse(completion.choices[0].message.content);

    const usage = completion.usage;
    const inputTokens = usage.prompt_tokens;
    const inputCost = inputTokens * (0.15 / 1000000);
    const outputTokens = usage.completion_tokens;
    const outputCost = outputTokens * (0.60 / 1000000);
    const chatCost = inputCost + outputCost;
    console.log("Chat Input Tokens: " + inputTokens);
    console.log("Chat Output Tokens: " + outputTokens);
    console.log("Chat Usage cost: $" + chatCost);

    console.log("Total AI Cost: " + chatCost);

    return { scheduled_datetime_utc, chat_cost: chatCost };
}
