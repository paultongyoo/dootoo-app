import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();
const ITEMS_KEY_ID = process.env.ITEMS_KEY_ID;
const lambda = new AWS.Lambda();

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

        // Encrypt text before insert
        const encryptParams = {
            KeyId: ITEMS_KEY_ID,
            Plaintext: Buffer.from(event.text)
        };
        const encryptedData = await kms.encrypt(encryptParams).promise();
        const encryptedText = encryptedData.CiphertextBlob.toString('base64');

        var updatedItem = await prisma.item.update({
            where: { id: item.id },
            data: { text: encryptedText }
        });

        updatedItem = await loadItem(user.anonymous_id, item.uuid);
        const response = {
            statusCode: 200,
            body: JSON.stringify(updatedItem)
        };
        await prisma.$disconnect();
        return response;
    } catch (error) {
        await prisma.$disconnect();
        return {
            statusCode: 500,
            body: `Error occurred: ${error}`
        }
    }
}

const loadItem = async (anonymous_id, item_uuid) => {
    const lambdaParams = {
        FunctionName: "loadItems_Dev", // Replace with the name of the other Lambda
        InvocationType: "RequestResponse", // Use "Event" for asynchronous invocation
        Payload: JSON.stringify({ anonymous_id: anonymous_id, item_uuid: item_uuid })
    };

    try {
        const response = await lambda.invoke(lambdaParams).promise();
        const arrayOfOne = JSON.parse(JSON.parse(response.Payload).body);
        console.log("Number of updated items: " + arrayOfOne.length);
        if (arrayOfOne.length == 1) {
            return arrayOfOne[0];
        } else {
            console.log("Unexpected response from loadItems: " + JSON.stringify(arrayOfOne));
            return arrayOfOne;
        }
    } catch (error) {
        console.error("Error invoking Lambda function:", error);
        throw error;
    }
}