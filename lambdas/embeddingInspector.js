import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import AWS from 'aws-sdk';
const kms = new AWS.KMS();
import { Parser } from 'json2csv';

export const handler = async (event) => {
  const comparisons = await prisma.$queryRawUnsafe(
    `SELECT a.text AS id1, 
            b.text AS id2, 
            a.embedding <-> b.embedding AS cosine_distance 
    FROM "Item" a 
    JOIN "Item" b 
      ON a.id < b.id 
    ORDER BY cosine_distance asc LIMIT 1000`);
    var csvData = [];
    for (const comparison of comparisons) {
    const firstString = await decryptText(comparison.id1);
    const secondString = await decryptText(comparison.id2);
    csvData.push({ text1: firstString, text2: secondString, dist: comparison.cosine_distance});
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