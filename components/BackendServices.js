import axios from 'axios';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { generateCurrentTimeAPIHeaders } from './Helpers';

const BACKEND_TRANSCRIPTION_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/transcribeAudioToTasks_Dev'
                                            : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/transcribeAudioToTasks';

const BACKEND_TRANSCRIPTION_TIPS_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/transcribeAudioToTips_Dev' 
                                                 : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/transcribeAudioToTips';

const BACKEND_GENERATETIPCTA_URL = (__DEV__) ? 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/generateTipCTA_Dev'
                                             : 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/prod/generateTipCTA';

const OPENAI_STATUS_COMPONENTS_URL = 'https://status.openai.com/api/v2/components.json';

export const transcribeAudioToTasks = async (fileUri, anonymous_id) => {
 //console.log("Entering transcribeAudiToTasks with anonymous Id: " + anonymous_id);

  // Read the file as a binary base64 string
  const fileData = await RNFS.readFile(fileUri, 'base64');

  // Convert base64 string to binary Buffer
  const binaryData = Buffer.from(fileData, 'base64');

  //console.log("Created BinaryData object with length: " + fileData.length);

  const fileExtension = fileUri.split('.').pop();
  //console.log("Audio File Extension: " + fileExtension);


  // Generate user time info to pass to the API for handling of any scheduled tasks
  const currentTimeAPIHeaders = generateCurrentTimeAPIHeaders();

  // 1.2:  Intentionally allowing exceptions to bubble up the stack so UI can catch error and inform user.
  // try {

    // Note:  Lambda lowercases all header keys
    const response = await axios.post(
      BACKEND_TRANSCRIPTION_URL,
      binaryData,
      {
        headers: {
          'anonymous_id': anonymous_id,
          'userlocaltime' : currentTimeAPIHeaders.userlocaltime,
          'usertimezone'  : currentTimeAPIHeaders.usertimezone,
          'utcdatetime': currentTimeAPIHeaders.utcdatetime,
          'Content-Type': `audio/${fileExtension}`
        },
      }
    );
    return response.data;

  // } catch (error) {
  //   console.error('Error calling API:', JSON.stringify(error));
  //   throw new Error(error);
  // }
};

export const transcribeAudioToTips = async (fileUri, anonymous_id) => {
  //console.log("Entering transcribeAudioToTips with anonymous Id: " + anonymous_id);

  // Read the file as a binary base64 string
  const fileData = await RNFS.readFile(fileUri, 'base64');

  // Convert base64 string to binary Buffer
  const binaryData = Buffer.from(fileData, 'base64');

  //console.log("Created BinaryData object with length: " + fileData.length);

  const fileExtension = fileUri.split('.').pop();
  //console.log("Audio File Extension: " + fileExtension);

  // 1.2:  Intentionally allowing exceptions to bubble up the stack so UI can catch error and inform user.
  // try {

    const response = await axios.post(
      BACKEND_TRANSCRIPTION_TIPS_URL,
      binaryData,
      {
        headers: {
          'anonymous_id': anonymous_id,
          'Content-Type': `audio/${fileExtension}`
        },
      }
    );
    return response.data;
  // } catch (error) {
  //   console.error('Error calling API:', error);
  // }
};

export const generateTipCTA = async(anonymous_id, item_uuid) => {
  try {
    const response = await axios.post(BACKEND_GENERATETIPCTA_URL,
      {
        anonymous_id : anonymous_id,
        item_uuid: item_uuid
      }
    );
    //console.log("generateTipCTA Response Obj: " + JSON.stringify(response.data.body));
    return response.data.body;
  } catch (error) {
    console.error('Error calling generateTipCTA API:', error);
  }
}

export const checkOpenAPIStatus = async() => {
  try {
    const response = await axios.get(OPENAI_STATUS_COMPONENTS_URL);
    const openAIComponentsArray = response.data.components;
    let status = '';
    openAIComponentsArray.forEach((component) => {
      if (component.name == "API") {
        status = component.status;
      }
    })
    return status;
  } catch (error) {
    console.error('Error calling checkOpenAIAPIHealth API:', error);
  }
}

