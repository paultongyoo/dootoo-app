import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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


        const posted_uuids = JSON.parse(event.uuid_array);

        // Retrieve only undeleted item UUIDs for user
        const saved_uuids = await prisma.item.findMany({
            where: {
                user: { id: user.id },
                is_deleted: false
            },
            select: { uuid: true }
        });

        // // Validate lengths of lists match
        // TODO: Refactor or remove -- Commented this out as this won't work given paging (list lengths won't match)
        // if (saved_uuids.length != posted_uuids.length) {
        //     const message = `UUID Array Length (${posted_uuids.length}) does not match what's saved in DB (${saved_uuids.length})`;
        //     console.log(message)
        //     return {
        //         statusCode: 403,
        //         body: message
        //     }
        // }

        // Validate each posted UUID can be found in DB list
        const savedUUIDSet = new Set(saved_uuids.map(obj => obj.uuid));
        const allMatch = posted_uuids.every(obj => savedUUIDSet.has(obj.uuid));
        if (!allMatch) {
            console.log("Mismatch between posted UUIDs and saved UUIDs.");
            console.log("Posted UUIDs: " + JSON.stringify(posted_uuids));
            console.log("Saved UUIDS: " + JSON.stringify(saved_uuids));
            return {
                statusCode: 403,
                body: `Posted UUID Array does not match saved UUIDs.`
            }
        }

        const newRanks = posted_uuids.map((obj, index) => ({ uuid: obj.uuid, rank_idx: index }));
        console.log("newRanks: " + JSON.stringify(newRanks));

        const query = `
            UPDATE "Item"
            SET "rank_idx" = CASE 
                ${newRanks.map(({ uuid, rank_idx }) => 
                    `WHEN "uuid" = '${uuid}' THEN ${rank_idx}`).join(' ')}
            END
            WHERE "uuid" IN (${newRanks.map(({ uuid }) => `'${uuid}'`).join(',')});
            `;

        //console.log("Query: " + query);
        const result = await prisma.$executeRawUnsafe(query);
        //console.log("Result: " + JSON.stringify(result));

        const response = {
            statusCode: 200,
            body: result
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


