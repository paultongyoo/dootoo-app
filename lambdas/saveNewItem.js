import AWS from 'aws-sdk';
const lambda = new AWS.Lambda();

export const handler = async (event) => {
    const anonymousId = event.anonymous_id;
    const item = JSON.parse(event.item_str);
    const uuid_array = JSON.parse(event.uuid_array);

    try {

        // Call prexisting saveItems lambda with single item array, deactivating deprecated post actions
        await saveItem(anonymousId, item);     // Discard object

        // Call preexisting updateItemOrder function
        const updateResult = await updateItemOrder(anonymousId, uuid_array);

        const response = {
            statusCode: 200,
            body: updateResult
        };
        return response;
    } catch (error) {
        console.log("Returning 422 error back to caller!", error);
        return {
            statusCode: 422,
            body: error.message
        }
    }
};

const saveItem = async (anonymousId, item) => {
    const lambdaParams = {
        FunctionName: "saveItems_Dev:prod",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({
            anonymous_id: anonymousId,
            items_str: JSON.stringify([item]),
            skipUserLoad: true,
            skipLoad: true
        })
    };

    try {
        const response = await lambda.invoke(lambdaParams).promise();
        if (JSON.parse(response.Payload).statusCode == 200) {
            const user = JSON.parse(response.Payload).body;
            return user;
        } else {
            throw new Error(JSON.parse(response.Payload).body)
        }
    } catch (error) {
        console.error("Error invoking saveItems Lambda function:", error);
        throw error;
    }
}

const updateItemOrder = async (anonymousId, uuid_array) => {
    const lambdaParams = {
        FunctionName: "updateItemOrder_Dev:prod",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({
            anonymous_id: anonymousId,
            uuid_array: JSON.stringify(uuid_array)
        })
    };

    try {
        const response = await lambda.invoke(lambdaParams).promise();
        const result = JSON.parse(response.Payload).body;
        return result;
    } catch (error) {
        console.error("Error invoking updateItemOrder Lambda function:", error);
        throw error;
    }
}
