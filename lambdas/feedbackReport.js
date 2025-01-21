import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { Parser } from 'json2csv';

export const handler = async (event) => {
    const feedbackResponses = await prisma.$queryRawUnsafe(
        `SELECT 
            username,
            elem->>'question' AS question,
            elem->>'answer' AS answer,
            "createdAt"
        FROM "Feedback", 
            jsonb_array_elements(form_input) AS elem
        order by "createdAt" desc
        LIMIT 100`);

    var csvData = [];
    for (const response of feedbackResponses) {
        csvData.push({
            username: response.username,
            question: response.question,
            answer: response.answer,
            submittedAt: response.createdAt
        });
    }

    await prisma.$disconnect();

    try {
        // Convert JSON to CSV
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(csvData);

        const currentDateTime = new Date().toISOString()
        .replace(/[:.]/g, '-') // Replace characters not allowed in filenames
        .replace('T', '_')     // Replace 'T' with '_' for better readability
        .split('.')[0];        // Remove milliseconds for cleaner format
      
      const dynamicFilename = `feedback-${currentDateTime}.csv`;

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename=${dynamicFilename}`,
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