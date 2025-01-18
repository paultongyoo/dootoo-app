import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import AWS from 'aws-sdk';
const kms = new AWS.KMS();
import { Parser } from 'json2csv';

export const handler = async (event) => {
    const username = 'OptimisticDoer6032';
    const userItems = await prisma.$queryRawUnsafe(
        `SELECT 
            i.uuid, 
            i.text, 
            i.rank_idx, 
            i.is_done,
            i.is_deleted,
            i."createdAt",
            ((i.is_deleted IS false) AND (parent_i.is_deleted IS true)) as is_orphan,
            parent_i.text as parent_text,
            parent_i.uuid as parent_uuid,
            parent_i.is_deleted as parent_is_deleted
     FROM "Item" i
     LEFT JOIN "User" u
            ON i.user_id = u.id
     LEFT JOIN "Item" parent_i
            ON i.parent_item_id = parent_i.id
     WHERE u.name = '${username}'
     ORDER BY i."createdAt" desc
     LIMIT 100`);

    var csvData = [];
    for (const item of userItems) {
        item.text = await decryptText(item.text);
        if (item.parent_text) {
            item.parent_text = await decryptText(item.parent_text);
        }
        csvData.push({ 
            uuid: item.uuid, 
            text: item.text, 
            rank_idx: item.rank_idx,
            is_done: item.is_done,
            is_deleted: item.is_deleted,
            created_at: item.createdAt,
            is_orphan: item.is_orphan,
            parent_text: item.parent_text,
            parent_uuid: item.parent_uuid,
            parent_is_deleted: item.parent_is_deleted
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
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename=\"${username}.csv\"`,
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