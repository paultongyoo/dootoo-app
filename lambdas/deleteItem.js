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
    //console.log(user);
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

    // Set specified item to deleted
    const updatedAdult = await prisma.item.update({
        where: { id: item.id },
        data: { is_deleted: true}
    });
    console.log("Deleted adult: " + JSON.stringify(updatedAdult));

    // Set all item children to is_deleted as well, if any
    const updateChildrenCount = await prisma.item.updateMany({
        where: { 
            parent: { 
                id: item.id 
            }
        },
        data: { is_deleted: true }
    });
    console.log("Num children set to deleted: " + updateChildrenCount.count);

    const response = {
        statusCode: 200,
        body: JSON.stringify({ deleted_uuid: updatedAdult.uuid, num_children_deleted: updateChildrenCount.count })
    };
    await prisma.$disconnect();
    return response;
}