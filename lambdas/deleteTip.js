import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
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
    const tip = await prisma.tip.findUnique({
        where: {
            user: { id: user.id },
            uuid: event.tip_uuid
        }
    });
    if (tip == null) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Can\'t find tip owned by user!' })
        };
    }

    const updatedTip = await prisma.tip.update({
        where: { id: tip.id },
        data: { is_deleted: true}
    });

    const response = {
        statusCode: 200,
        body: JSON.stringify(updatedTip)
    };
    await prisma.$disconnect();
    return response;
}