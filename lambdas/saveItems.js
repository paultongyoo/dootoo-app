import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
  const itemSaveCount = await saveItems(event.anonymous_id, event.items_str)
    .then(async () => {
            await prisma.$disconnect()
        })
        .catch(async (e) => {
            console.error(e)
            await prisma.$disconnect()
        });
  console.log(`Returned item save count: ${itemSaveCount}`);
  const response = {
    statusCode: (itemSaveCount >= 0) ? 200 : 400,
    body: itemSaveCount,
  };
  return response;
};

const saveItems = async(anonymous_id, items_str) => {
    const user = await prisma.user.findUnique({
        where: { anonymous_id: anonymous_id}
    });
    console.log(user);
    if (user == null) {
        console.log(`Anonymous ID ${anonymous_id} not found in DB, aborting save!`);
        return -1;
    }

    var itemSaveCount = 0;
    var items_arr = JSON.parse(items_str);
    for (var i = 0; i < items_arr.length; i++) {
        var array_item = items_arr[i];

        const item = await prisma.item.upsert({
            where: { task_id: array_item.task_id},
            create: { 
                task_id: array_item.task_id,
                user: {
                    connect: { id: user.id }
                },
                item_text: array_item.item_text,
                is_child: array_item.is_child,
                rank_idx: i,
                is_done: false  // item.is_done TODO: Save done status
            },
            update: { 
                task_id: array_item.task_id,
                user: {
                    connect: { id: user.id }
                },
                item_text: array_item.item_text,
                is_child: array_item.is_child,
                rank_idx: i,
                is_done: false // item.is_done TODO: Save done status
            }
        });
        console.log(item); 
        itemSaveCount += 1;
    }
    return itemSaveCount;
}
