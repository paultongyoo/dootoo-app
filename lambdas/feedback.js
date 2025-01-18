import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const handler = async (event) => {
    try {
        const user = await prisma.user.findUnique({
            where: { anonymous_id: event.anonymous_id }
        });
        if (user == null) {
            return {
                statusCode: 403
            };
        }
        console.log(user);
       
        const feedback = await prisma.feedback.create({
            data: { 
                anonymous_id: user.anonymous_id,
                username: user.name,
                form_input : JSON.parse(event.form_input)
            }
        });
        console.log("Feedback: " + JSON.stringify(feedback));

        const response = {
            statusCode: 200
        };
        return response;
    } catch (error) {   
        console.log("Error creating feedback!", error);
        return {
            statusCode: 500,
            body: `Error occurred: ${error}`
        }
    } finally {
        await prisma.$disconnect();
    }
}