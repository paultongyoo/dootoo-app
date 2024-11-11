import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import OpenAI from "openai";
const openai = new OpenAI();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();

export const handler = async (event) => {
    try {
        var cta = '';
        const user = await prisma.user.findUnique({
            where: { anonymous_id: event.anonymous_id }
        });
        console.log(user);
        if (user == null) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Can\'t find user!' })
            };
        }
        const item = await prisma.item.findUnique({
            where: { uuid: event.item_uuid }
        });
        console.log(item);
        if (item == null) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Can\'t find item owned by user!' })
            };
        }

        const decryptedString = await decryptItemText(item);
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    "role": "system",
                    "content": "Create a short casually-worded call to action for a mobile app user to share tips " +
                        "for completing tasks similar to the provided user task, generalizing all references the user may make to specific names. " +
                        "Use the following format: 'Share your best tips with the community to help them <do the user task generalizing references to specific names>."
                },
                { "role": "user", "content": decryptedString }
            ]
        });
        cta = completion.choices[0].message.content;
        console.log("Generated CTA: " + cta);

        const response = {
            statusCode: 200,
            body: cta
        };
        await prisma.$disconnect();
        return response;
    } catch (error) {
        console.error("Unexpected error occured: ", error);
        await prisma.$disconnect();
        return {
            statusCode: 403,
            body: error.message
        }
    }
};

const decryptItemText = async (item) => {
    const decryptParams = {
        CiphertextBlob: Buffer.from(item.text, 'base64')
    };
    const decryptedData = await kms.decrypt(decryptParams).promise();
    return decryptedData.Plaintext.toString('utf-8');
}