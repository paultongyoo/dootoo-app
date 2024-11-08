import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
  const user = await saveTips(event.anonymous_id, event.item_uuid, event.tips_str);
  const updatedUser = await refreshUpdatedCounts(user);
  console.log("Returning updatedUser: " + JSON.stringify(updatedUser));
  const response = {
    statusCode: 200,
    body: JSON.stringify(updatedUser)
  };
  await prisma.$disconnect()
  return response;
};

const saveTips = async(anonymous_id, item_uuid, tips_str) => {
    var user = null;
    try {
        user = await prisma.user.findUnique({
            where: { anonymous_id: anonymous_id}
        });
        console.log(user);
        if (user == null) {
            console.log(`Anonymous ID ${anonymous_id} not found in DB, aborting save!`);
            return null;
        }        
        const item_obj = await prisma.item.findUnique({
            where: { uuid: item_uuid}
        });
        console.log(item_obj);
        if (item_obj == null) {
            console.log(`Item ${item_uuid} not found in DB, aborting save!`);
            return null;
        }

        var tips_arr = JSON.parse(tips_str);
        for (var i = 0; i < tips_arr.length; i++) {
            var array_tip = tips_arr[i];

            const tip = await prisma.tip.upsert({
                where: { uuid: array_tip.uuid},
                create: { 
                    uuid: array_tip.uuid,
                    item: {
                        connect: { id: item_obj.id }
                    },
                    user: {
                        connect: { id: user.id }
                    },
                    text: array_tip.text,
                    rank_idx: i,
                    is_deleted: array_tip.is_deleted,
                    is_flagged: false 
                },
                update: { 
                    text: array_tip.text,
                    rank_idx: i,
                    is_deleted: array_tip.is_deleted,
                    is_flagged: array_tip.is_flagged
                }
            });
            console.log(tip); 
        }
    } catch (error) {
        console.error('Unexpected Prisma error', error);
        return null;
    } 
    console.log("Inside saveTips - checking user obj: " + user);
    return user;
}

const refreshUpdatedCounts = async(loadedUser) => {
    console.log("User loaded: " + JSON.stringify(loadedUser));

    // Count user's completed tasks 
    loadedUser.doneCount = await prisma.item.count({
        where: {
            user: {
                id: loadedUser.id
            },
            is_done: true
        }
    });
    console.log("User Task Done Count: " + loadedUser.doneCount);

    // Count user's tips 
    loadedUser.tipCount = await prisma.tip.count({
        where: {
            user: {
                id: loadedUser.id
            },
            is_deleted: false
        }
    });
    console.log("User Task Tip Count: " + loadedUser.tipCount);
    
    return loadedUser;
}
