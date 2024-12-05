import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import OpenAI from "openai";
const openai = new OpenAI();

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

        var textUpdate = event.text

        // Confirm text passes moderation
        textUpdate = await moderateText(textUpdate);

        const updatedTip = await prisma.tip.update({
            where: { id: tip.id },
            data: { text: textUpdate }
        });

        const response = {
            statusCode: 200,
            body: JSON.stringify(updatedTip)
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

async function moderateText(textUpdate) {
    const moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: textUpdate
    });
    const flagged = moderation.results[0].flagged;
    if (flagged) {
        textUpdate = '(flagged)';
    }
    return textUpdate;
}