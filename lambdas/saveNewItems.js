import AWS from 'aws-sdk';
const lambda = new AWS.Lambda();

export const handler = async (event) => {
    const anonymousId = event.anonymous_id;
    const items = JSON.parse(event.items_str);
    const uuid_array = JSON.parse(event.uuid_array);

    // Call prexisting saveItems lambda with single item array, deactivating deprecated post actions
     await saveItems(anonymousId, items);     // Discard object

    // Call preexisting updateItemOrder function
    const updateResult = await updateItemOrder(anonymousId, uuid_array);

    const response = {
        statusCode: 200,
        body: updateResult
    };
    return response;
};

const saveItems = async (anonymousId, items) => {
    const lambdaParams = {
        FunctionName: "saveItems_Dev:prod",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({
            anonymous_id: anonymousId,
            items_str: JSON.stringify(items),
            skipUserLoad: true,
            skipLoad: true
        })
    };

    try {
        const response = await lambda.invoke(lambdaParams).promise();
        const user = JSON.parse(response.Payload).body;
        return user;
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
