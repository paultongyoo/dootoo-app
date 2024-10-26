import axios from 'axios';
export const handler = async (event) => {

  try {
    var stringToVectorize = event.text;
    const response = await axios.post(
      "http://ip-172-31-28-150.us-east-2.compute.internal:8000/embed",
      { text: stringToVectorize }
    );
    return {
      statusCode: 200,
      body: response.data.embedding,
    };
  } catch (error) {
    console.error('Error calling API:', error);
    return {
      statusCode: 500,
      body: error.message
    }
  }
};
