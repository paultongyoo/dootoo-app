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

        var updatedItem = null;
        if (event.parent_item_uuid) {
            const parent_item = await prisma.item.findUnique({
                where: {
                    user: { id: user.id },
                    uuid: event.parent_item_uuid
                }
            });
            if (parent_item == null) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({ error: 'Can\'t find parent item owned by user!' })
                };
            }
            updatedItem = await prisma.item.update({
                where: { id: item.id },
                data: { parent_item_id: parent_item.id }
            });
        } else {
            updatedItem = await prisma.item.update({
                where: { id: item.id },
                data: { parent_item_id: null }
            });
        }

        console.log("Updated Item: " + JSON.stringify(updatedItem));

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