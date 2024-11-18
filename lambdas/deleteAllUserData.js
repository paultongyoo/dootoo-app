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

        const deletedVotesCount = await prisma.tipVote.deleteMany({
            where: {
                user: {
                    id: user.id
                }
            }
        });
        const deletedTipsCount = await prisma.tip.deleteMany({
            where: {
                user: {
                    id: user.id
                }
            }
        });
        const deletedItemsCount = await prisma.item.deleteMany({
            where: {
                user: {
                    id: user.id
                }
            }
        });
        const deletedUser = await prisma.user.delete({
            where: { id: user.id }
        });

        await prisma.$disconnect();
        const deletedInfo = { 
            deletedUser: deletedUser.name, 
            deletedItems: deletedItemsCount,
            deletedTips: deletedTipsCount,
            deletedVotes: deletedVotesCount
        };
        console.log("Deleted Info: " + JSON.stringify(deletedInfo));
        return {
            statusCode: 200,
            body: deletedInfo
        };
    } catch (error) {
        console.log("Error occurred while deleting user data", error);
        return {
            statusCode: 500,
            body: JSON.stringify(error)
        };
    }
}