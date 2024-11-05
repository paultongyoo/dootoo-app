import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import OpenAI from "openai";
const openai = new OpenAI();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();

export const handler = async (event) => {
    var cta = '';
    const user = await prisma.user.findUnique({
        where: { anonymous_id: event.anonymous_id}
    });
    console.log(user);
    const selectedItem = await prisma.item.findUnique({
        where: { uuid: event.item_uuid }
    });
    console.log(selectedItem);

    const retrievedTips = await prisma.tip.findMany({
        where: { 
            item: { id: selectedItem.id },
            is_deleted: false
        },
        orderBy: {
          rank_idx: 'asc'
        }
    });
    console.log("Returning " + retrievedTips.length + " tips...");

    if (retrievedTips.length == 0) {
        // Decrypt item text
        const decryptParams = {
            CiphertextBlob: Buffer.from(selectedItem.text, 'base64')
        };
        const decryptedData = await kms.decrypt(decryptParams).promise();
        const decryptedString = decryptedData.Plaintext.toString('utf-8');

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
            {"role": "system", 
                "content": "Create a short casually-worded call to action for a mobile app user to share their best tips with the community for the provided user task.  " +
                        "Use the following format: 'Share your best tips with the community to help them <do the user task>."},
            {"role": "user", "content": decryptedString }
            ]
        });
        cta = completion.choices[0].message.content;
        console.log("Generated CTA: " + cta);
    } else {
        console.log("Skipping generating CTA since we have tips for this item.")
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({ cta: cta, tips: retrievedTips })
    };
    await prisma.$disconnect();
    return response;
};
