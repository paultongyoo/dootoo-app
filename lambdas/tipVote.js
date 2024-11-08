import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {

  const user = await prisma.user.findUnique({
    where: { anonymous_id: event.anonymous_id }
  });
  console.log(user);
  if (user == null) {
    console.log(`Anonymous ID ${anonymous_id} not found in DB, aborting save!`);
    return {
      statusCode: 403,
      body: "Unknown Anonymous ID"
    };
  }

  const tip = await prisma.tip.findUnique({
    where: { uuid: event.tip_uuid }
  });
  console.log(tip);
  if (tip == null) {
    console.log(`Tip UUID ${anonymous_id} not found in DB, aborting save!`);
    return {
      statusCode: 403,
      body: "Unknown Tip UUID"
    };
  }

  if (tip.user_id == user.id) {
    console.log("User owns specified tip, aborting save!  Can't vote on tips you own!");
    return {
      statusCode: 403,
      body: "User owns tip!  Can't vote on tips you own!"
    };
  }

  const upsertedTip = await prisma.tipVote.upsert({
    where: {
      tip_id_user_id: { tip_id: tip.id, user_id: user.id }
    },
    create: {
      user: {
        connect: { id: user.id }
      },
      tip: {
        connect: { id: tip.id }
      },
      value: event.vote_value
    },
    update: {
      value: event.vote_value
    }
  });
  console.log("TipVote upsert response: " + upsertedTip);

  const response = {
    statusCode: 200,
    body: JSON.stringify(upsertedTip)
  };
  return response;
};
