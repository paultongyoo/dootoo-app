import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
  const items = await loadItems(event.anonymous_id)
    .then(async () => {
            await prisma.$disconnect()
        })
        .catch(async (e) => {
            console.error(e)
            await prisma.$disconnect()
        });
  console.log(items);
  const response = {
    statusCode: 200,
    body: items,
  };
  return response;
};

const loadItems = async(anonymous_id) => {
    const user = await prisma.user.findUnique({
        where: { anonymous_id: anonymous_id}
    });
    console.log(user);
    const items = await prisma.item.findMany({
        where: { 
            user: { anonymous_id: anonymous_id }
        }
    });
    return items;
}
