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
            },
            include: { parent: true }
        });
        if (item == null) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Can\'t find item owned by user!' })
            };
        }

        console.log("event.scheduled_datetime_utc: " + event.scheduled_datetime_utc);
        const updatedItem = await prisma.item.update({
            where: { id: item.id },
            data: { 
                scheduled_datetime_utc: event.scheduled_datetime_utc ,
                ...(item.is_public && {
                    public_update_desc: 'updated',
                    public_updatedAt: new Date()
                }),
                ...(item.parent && item.parent.is_public && {
                    parent: {
                        update: {
                            public_update_desc: 'updated',
                            public_updatedAt: new Date()
                        }
                    }
                })
            }
        });
        console.log("Updated Item: " + JSON.stringify(updatedItem));

        const response = {
            statusCode: 200,
            body: true
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