import AWS from 'aws-sdk';
const lambda = new AWS.Lambda();

export const handler = async (event) => {
    const anonymousId = event.anonymous_id;
    const item_uuid = event.item_uuid;
    const tips = JSON.parse(event.tips_str);
    const uuid_array = JSON.parse(event.uuid_array);

    // Call prexisting saveTips lambda
    const updatedUserStr = await saveTips(anonymousId, item_uuid, tips); 

    // Call preexisting updateItemOrder function
    const updateResult = await updateTipOrder(anonymousId, item_uuid, uuid_array);

    const response = {
        statusCode: 200,
        body: updateResult
    };
    return response;
};

const saveTips = async (anonymousId, item_uuid, tips) => {
    const lambdaParams = {
        FunctionName: "saveTips_Dev:prod",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({
            anonymous_id: anonymousId,
            item_uuid: item_uuid,
            tips_str: JSON.stringify(tips)
        })
    };

    try {
        const response = await lambda.invoke(lambdaParams).promise();
        const user = JSON.parse(response.Payload).body;
        return user;
    } catch (error) {
        console.error("Error invoking saveTips Lambda function:", error);
        throw error;
    }
}

const updateTipOrder = async (anonymousId, item_uuid, uuid_array) => {
    const lambdaParams = {
        FunctionName: "updateTipOrder_Dev:prod",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({
            anonymous_id: anonymousId,
            item_uuid: item_uuid,
            uuid_array: JSON.stringify(uuid_array)
        })
    };

    try {
        const response = await lambda.invoke(lambdaParams).promise();
        const result = JSON.parse(response.Payload).body;
        return result;
    } catch (error) {
        console.error("Error invoking updateTipOrder Lambda function:", error);
        throw error;
    }
}
