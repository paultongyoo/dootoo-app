import axios from 'axios';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

const BACKEND_TRANSCRIPTION_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/transcribeAudioToTasks_Dev';
const BACKEND_TRANSCRIPTION_TIPS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/transcribeAudioToTips_Dev';
const BACKEND_GENERATETIPCTA_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/generateTipCTA_Dev';

export const transcribeAudioToTasks = async (fileUri, anonymous_id) => {
  console.log("Entering transcribeAudiToTasks with anonymous Id: " + anonymous_id);

  // Read the file as a binary base64 string
  const fileData = await RNFS.readFile(fileUri, 'base64');

  // Convert base64 string to binary Buffer
  const binaryData = Buffer.from(fileData, 'base64');

  console.log("Created BinaryData object with length: " + fileData.length);

  const fileExtension = fileUri.split('.').pop();
  console.log("Audio File Extension: " + fileExtension);

  try {

    const response = await axios.post(
      BACKEND_TRANSCRIPTION_URL,
      binaryData,
      {
        headers: {
          'anonymous_id': anonymous_id,
          'Content-Type': `audio/${fileExtension}`
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error calling API:', error);
    return `Modified file URI: ${modifiedFileUri} | File length: ${fileData.length} | Binary Data Length: ${binaryData.length} | ${error.message} | ${JSON.stringify(error)}`;
  }
};

export const transcribeAudioToTips = async (fileUri, anonymous_id) => {
  console.log("Entering transcribeAudioToTips with anonymous Id: " + anonymous_id);

  // Read the file as a binary base64 string
  const fileData = await RNFS.readFile(fileUri, 'base64');

  // Convert base64 string to binary Buffer
  const binaryData = Buffer.from(fileData, 'base64');

  console.log("Created BinaryData object with length: " + fileData.length);

  const fileExtension = fileUri.split('.').pop();
  console.log("Audio File Extension: " + fileExtension);

  try {

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
  } catch (error) {
    console.error('Error calling API:', error);
    return `Modified file URI: ${fileUri} | File length: ${fileData.length} | Binary Data Length: ${binaryData.length} | ${error.message} | ${JSON.stringify(error)}`;
  }
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

