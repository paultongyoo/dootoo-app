import axios from 'axios';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

// WARNING:  Cyclical ref between LocalStorage -> BackendServices -> LocalStorage -- do not initialize variables in either file!
import { getLocalAnonId } from './LocalStorage';  

const BACKEND_TRANSCRIPTION_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/transcribeAudioToTasks_Dev';
const BACKEND_CREATEUSER_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/createUser_Dev';
const BACKEND_LOADITEMS_URL = 'https://jyhwvzzgrg.execute-api.us-east-2.amazonaws.com/dev/loadItems_Dev';


export const transcribeAudioToTasks = async (fileUri) => {

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

export const createUser = async () => {
  try {
    const response = await axios.post(BACKEND_CREATEUSER_URL);
    console.log("Retreived new user from backend: " + JSON.stringify(response.data.body));
    return response.data.body;
  } catch (error) {
    console.error('Error calling create User API:', error);
  }
};

export const loadItems = async () => {
  try {

    const localAnonId = await getLocalAnonId();
    if (!localAnonId) {
      console.log("Received null local anon Id, aborting loadItems!");
      return [];
    }
    const response = await axios.post(BACKEND_LOADITEMS_URL,
      {
        anonymous_id : localAnonId
      }
    );
    console.log(`Retrieved ${response.data.body.length} items from backend: ${JSON.stringify(response.data.body)}`);
    return response.data.body;
  } catch (error) {
    console.error('Error calling loadItems API:', error);
  }
};