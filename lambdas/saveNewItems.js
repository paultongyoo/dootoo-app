import AWS from 'aws-sdk';
const lambda = new AWS.Lambda();

export const handler = async (event) => {
    const anonymousId = event.anonymous_id;
    const items = JSON.parse(event.items_str);
    const uuid_array = JSON.parse(event.uuid_array);

    try {

        // Call prexisting saveItems lambda with single item array, deactivating deprecated post actions
        await saveItems(anonymousId, items);     // Discard object

        // Call preexisting updateItemOrder function
        const updateResult = await updateItemOrder(anonymousId, uuid_array);

        const response = {
            statusCode: 200,
            body: updateResult
        };
        return response;
    } catch (error) {
        const errorPayload = JSON.parse(error.message);
        if (errorPayload.flaggedItems) {
            console.log("Returning 422 error with details back to caller!", error);
            return {
                statusCode: 422,
                body: errorPayload.flaggedItems
            }
        } else {
            return {
                statusCode: 500,
                body: error.message
            }
        }
    }
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

    const response = await lambda.invoke(lambdaParams).promise();
    console.log("response: " + JSON.stringify(response));
    if (!response.FunctionError) {
        const user = JSON.parse(response.Payload).body;
        return user;
    } else {
        console.log("Attempting to parse nested error...");
        const nestedError = JSON.parse(response.Payload);
        console.log("nestedError: " + JSON.stringify(nestedError));
        throw new Error(nestedError.errorMessage);
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
