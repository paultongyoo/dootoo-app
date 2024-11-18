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

        const updatedItem = await prisma.item.update({
            where: { id: item.id },
            data: { is_child: event.is_child }
        });
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