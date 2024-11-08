import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import OpenAI from "openai";
const openai = new OpenAI();

import AWS from 'aws-sdk';
const kms = new AWS.KMS();

export const handler = async (event) => {
    var cta = '';
    const user = await prisma.user.findUnique({
        where: { anonymous_id: event.anonymous_id }
    });
    console.log(user);
    const selectedItem = await prisma.item.findUnique({
        where: { uuid: event.item_uuid }
    });
    console.log(selectedItem);

    // If the specified item is done, return the 
    // user's tips for the item (if any).
    //
    // ELSE return the tips of items similar to the specified item.

    var retrievedTips = []

    if (selectedItem.is_done) {
        console.log("Specified item is done, returning its tips (if any)...");
        retrievedTips = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(tip_net_vote::integer, 0) as upvote_count, "Tip".* 
            FROM "Tip" 
            LEFT JOIN (
                SELECT "TipVote".tip_id, SUM(value) as tip_net_vote
                FROM "TipVote" 
                LEFT JOIN "Tip" on "TipVote".id = "Tip".id
                LEFT JOIN "Item" on "Item".id = "Tip".item_id
                WHERE "Tip".is_deleted IS false AND "Tip".item_id = ${selectedItem.id}
                GROUP BY 1) tip_votes on "Tip".id = tip_votes.tip_id
            WHERE "Tip".is_deleted IS false AND "Tip".item_id = ${selectedItem.id}
            ORDER BY rank_idx ASC;`);
        console.log("Query returned " + retrievedTips.length + " tip(s).");
    } else {
        console.log("Specified item is NOT done, returning tips of similar items (if any)...");
        retrievedTips = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(tip_net_vote::integer, 0) as upvote_count, COALESCE(tip_user_vote, 0) as user_vote_value, "Tip".* 
            FROM "Tip" 
            LEFT JOIN "Item" on "Tip".item_id = "Item".id
            LEFT JOIN (
                SELECT tip_id, value as tip_user_vote 
                FROM "TipVote"
                WHERE user_id = ${user.id}) tip_user_vote on tip_user_vote.tip_id = "Tip".id
            LEFT JOIN (
                SELECT "TipVote".tip_id, SUM(value) as tip_net_vote
                FROM "TipVote" 
                LEFT JOIN "Tip" on "TipVote".id = "Tip".id
                LEFT JOIN "Item" on "Item".id = "Tip".item_id
                WHERE "Tip".is_deleted IS false AND "Tip".user_id <> ${user.id} AND 0.7 >= embedding <-> (select embedding from "Item" where uuid = '${selectedItem.uuid}')
                GROUP BY 1) tip_votes on "Tip".id = tip_votes.tip_id
            WHERE "Tip".is_deleted IS false AND "Tip".user_id <> ${user.id} AND 0.7 >= embedding <-> (select embedding from "Item" where uuid = '${selectedItem.uuid}')
            ORDER BY upvote_count DESC;`);
        console.log("Query returned " + retrievedTips.length + " tip(s).");
    }

    if (retrievedTips.length == 0) {
        const decryptedString = await decryptItemText(selectedItem);
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

const decryptItemText = async (item) => {
    const decryptParams = {
        CiphertextBlob: Buffer.from(item.text, 'base64')
    };
    const decryptedData = await kms.decrypt(decryptParams).promise();
    return decryptedData.Plaintext.toString('utf-8');
}