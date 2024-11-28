import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();
const ITEMS_KEY_ID = process.env.ITEMS_KEY_ID;

import axios from 'axios';

import OpenAI from "openai";
const openai = new OpenAI();

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
            }
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

        // Encrypt text before insert
        const encryptedText = await encryptText(textUpdate);

        var updatedItem = await prisma.item.update({
            where: { id: item.id },
            data: { text: encryptedText }
        });

        // Update embedding for new text
        await updateItemEmbedding(textUpdate, updatedItem);

        const response = {
            statusCode: 200,
            body: JSON.stringify(updatedItem)
        };
        return response;
    } catch (error) {
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
        textUpdate = '(flagged)';
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
