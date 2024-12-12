import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
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
    const pageSize = 15   // hardcode this for now

    // 1.2+ These variables are NOT passed to the SQL below if event.skipPagination == true
    const page = event.page || 1;
    const skip = (page - 1) * pageSize;
    const take = pageSize + 1;  // Take one more than pageSize to determine if there are more items

    if (selectedItem.is_done) {
        console.log("Specified item is done, returning its tips (if any)...");
        let query =             `SELECT COALESCE(tip_net_vote::integer, 0) as upvote_count, "Tip".* 
            FROM "Tip" 
            LEFT JOIN (
                SELECT "TipVote".tip_id, SUM(value) as tip_net_vote
                FROM "TipVote" 
                LEFT JOIN "Tip" on "TipVote".tip_id = "Tip".id
                LEFT JOIN "Item" on "Item".id = "Tip".item_id
                WHERE "Tip".is_deleted IS false AND "Tip".item_id = ${selectedItem.id}
                GROUP BY 1) tip_votes on "Tip".id = tip_votes.tip_id
            WHERE "Tip".is_deleted IS false AND "Tip".item_id = ${selectedItem.id}
            ORDER BY rank_idx ASC`;
        if (!event.skipPagination) {
            console.log("Pagination parameters added.")
            query += ` LIMIT ${take} OFFSET ${skip}`;
        } else {
            console.log("Pagination parameters skipped.")
        }
        retrievedTips = await prisma.$queryRawUnsafe(query);
        console.log("Query returned " + retrievedTips.length + " tip(s).");
    } else {
        let query = `SELECT COALESCE(tip_net_vote::integer, 0) as upvote_count, 
                    COALESCE(tip_user_vote, 0) as user_vote_value, 
                    "Tip".uuid, "Tip".text, "Tip".is_flagged, "User".name
            FROM "Tip" 
            LEFT JOIN "Item" on "Tip".item_id = "Item".id
            LEFT JOIN "User" on "Tip".user_id = "User".id
            LEFT JOIN (
                SELECT tip_id, value as tip_user_vote 
                FROM "TipVote"
                WHERE user_id = ${user.id}) tip_user_vote on tip_user_vote.tip_id = "Tip".id
            LEFT JOIN (
                SELECT "TipVote".tip_id, SUM(value) as tip_net_vote
                FROM "TipVote" 
                LEFT JOIN "Tip" on "TipVote".tip_id = "Tip".id
                LEFT JOIN "Item" on "Item".id = "Tip".item_id
                WHERE "Tip".is_deleted IS false AND "Tip".is_flagged IS false AND "Tip".user_id <> ${user.id} AND 0.7 >= embedding <-> (select embedding from "Item" where uuid = '${selectedItem.uuid}')
                GROUP BY 1) tip_votes on "Tip".id = tip_votes.tip_id
            WHERE "Tip".is_deleted IS false 
              AND "Tip".is_flagged IS false 
              AND "Tip".user_id <> ${user.id} 
              AND 0.7 >= embedding <-> (select embedding from "Item" where uuid = '${selectedItem.uuid}')
              AND "Tip".user_id NOT IN (
                    SELECT blocked_user_id 
                    FROM "UserBlock" 
                    WHERE blocking_user_id = ${user.id}
                )
              AND "Tip".user_id NOT IN (
                    SELECT blocking_user_id 
                    FROM "UserBlock" 
                    WHERE blocked_user_id = ${user.id}
                )          
            ORDER BY upvote_count DESC`;
            if (!event.skipPagination) {
                console.log("Pagination parameters added.")
                query += ` LIMIT ${take} OFFSET ${skip}`;
            } else {
                console.log("Pagination parameters skipped.")
            }
        console.log("Specified item is NOT done, returning tips of similar items (if any)...");
        retrievedTips = await prisma.$queryRawUnsafe(query);
        console.log("Query returned " + retrievedTips.length + " tip(s).");
    }

    let hasMore = retrievedTips.length > pageSize;
    if (event.skipPagination) {
        hasMore = false;  // Previous val discarded
    } else {
        console.log(`User does${(!hasMore) ? ' not' : ''} have more tips.`);
    }

    const response = {
        statusCode: 200,
        body: { hasMore: hasMore, tips: retrievedTips }
    };
    await prisma.$disconnect();
    return response;
};