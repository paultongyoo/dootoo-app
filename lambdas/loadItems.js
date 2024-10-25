import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
    const user = await prisma.user.findUnique({
        where: { anonymous_id: event.anonymous_id}
    });
    console.log(user);
    const retreivedItems = await prisma.item.findMany({
        where: { 
            user: { id: user.id }
        }
    });
  const response = {
    statusCode: 200,
    body: JSON.stringify(retreivedItems)
  };
  console.log("Response returned: " + retreivedItems);
  await prisma.$disconnect();
  return response;
};
