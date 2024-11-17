import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
  const itemDeleteCount = await deleteAllItems(event.anonymous_id)
    .then(async () => {
            await prisma.$disconnect()
        })
        .catch(async (e) => {
            console.error(e)
            await prisma.$disconnect()
        });
  //console.log(`Returned item delete count: ${itemDeleteCount}`);
  const response = {
    statusCode: (itemDeleteCount >= 0) ? 200 : 400,
    body: itemDeleteCount,
  };
  return response;
};

const deleteAllItems = async(anonymous_id, items_str) => {
    const user = await prisma.user.findUnique({
        where: { anonymous_id: anonymous_id}
    });
    //console.log(user);
    if (user == null) {
        //console.log(`Anonymous ID ${anonymous_id} not found in DB, aborting delete!`);
        return -1;
    }

    const deletedItemsCount = await prisma.item.deleteMany({
        where: { 
           user: {
            id: user.id
           } 
        }
    });
    //console.log(`Number of items deleted: ${deletedItemsCount.count}`);
    return deletedItemsCount.count;
}
