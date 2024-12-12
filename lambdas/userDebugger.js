import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import AWS from 'aws-sdk';
const kms = new AWS.KMS();
import { Parser } from 'json2csv';

export const handler = async (event) => {
    const username = 'pt7481';
    const userItems = await prisma.$queryRawUnsafe(
        `SELECT *
     FROM "Item" i
     LEFT JOIN "USER" u
            ON i.user_id = u.id
     WHERE u.name = '${username}'
     ORDER BY rank_idx`);

    var csvData = [];
    for (const item of userItems) {
        item.text = await decryptText(item.text);
        csvData.push({ 
            uuid: item.uuid, 
            text: item.text, 
            rank_idx: item.rank_idx
        });
    }

    await prisma.$disconnect();

    try {
        // Convert JSON to CSV
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(csvData);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="data.csv"',
            },
            body: csv
        };
    } catch (error) {
        console.error("Error converting JSON to CSV:", error);
        return {
            statusCode: 500,
            body: "Error generating CSV"
        };
    }
};

const decryptText = async (encryptedString) => {
    const decryptParams = {
        CiphertextBlob: Buffer.from(encryptedString, 'base64')
    };
    const decryptedData = await kms.decrypt(decryptParams).promise();
    return decryptedData.Plaintext.toString('utf-8');
}