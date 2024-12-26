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

        // If the item HAS a parent, it is a child element and therefore
        // changing its done state does not warrant moving it between the open and done lists.
        // Simply update its done state and return back to the caller.
        let updatedItem;
        if (!event.newOpenDoneLists || item.parent) {

            updatedItem = await prisma.item.update({
                where: { id: item.id },
                data: { is_done: event.is_done },
                select: {
                    uuid: true
                }
            });
            console.log("Updated Item: " + JSON.stringify(updatedItem));

        } else { 

            // The specified item is a parent.
            // This means we are moving it from the user's open items list to the done items list (if the item is being completed)
            // or vice versa (if the item is being reopened).  Update both lists' rank indicies accordingly.

            // First, update the item's done state, but also give it a negative rank so that it will be
            // ordered at the top of the done list in a follow up query.  We'll also ASSume here that
            // its children's done state have also been set to done or are in the process of being set to done
            // asynchronously.
            updatedItem = await prisma.item.update({
                where: { id: item.id },
                data: { 
                    is_done: (event.is_done == true),
                    rank_idx: -1
                },
                select: {
                    uuid: true
                }
            });
            await updateItemRankIndices(user, true);
            await updateItemRankIndices(user, false);
        }

        const response = {
            statusCode: 200,
            body: JSON.stringify(updatedItem)
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

const updateItemRankIndices = async (user, doneState) => {

        // Retrieve users' current list of non-deleted _parent_ items
        // but include children in resulset for later flattening.
        // Ensure both parent list and children lists are ordered by existing rank indicies
        let userCurrentList = await prisma.item.findMany({
            where: {
                user: {
                    id: user.id
                },
                is_done: doneState,
                is_deleted: false,
                parent_item_id: null
            },
            select: {
                uuid: true,
                rank_idx: true,
                children: {
                    select: {
                        uuid: true,
                        rank_idx: true
                    },
                    where: {
                        is_deleted: false
                    },
                    orderBy: {
                        rank_idx: 'asc'
                    }
                }
            },
            orderBy: {
                rank_idx: 'asc'
            }
        });
        //console.log(`User's current list of non-deleted items with matching done state (${userCurrentList.length})...`);
        //console.log(userCurrentList);
    
        // Flatten the result set so that rank indices for parents and their children can be derived
        const flattenItem = (item) => {
            const { children, ...parent } = item;
            return [parent, ...children];
        }
        const flattenedList = userCurrentList.flatMap((item) => flattenItem(item));
        //console.log(`Outputting flattened list (${flattenedList.length})...`);
        //console.log(flattenedList);
    
        // Update the rank indices of each item in a Prisma transaction to mitigate race conditions
        async function updateRankIndices(prisma, items) {
            // Use a transaction for batch updates
            await prisma.$transaction(
                items.map((item, index) => {
                    return prisma.item.updateMany({
                        where: { uuid: item.uuid },
                        data: { rank_idx: index },
                    });
                })
            );
        }
        await updateRankIndices(prisma, flattenedList);
        console.log("Revised indicies of " + flattenedList.length + " " + doneState + " items.");
}