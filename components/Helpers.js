import { Alert, Platform } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';
import { DateTime } from 'luxon';
import uuid from 'react-native-uuid';
import RNFS from 'react-native-fs';

export const formatNumber = (num) => {
  if (!num) return null;
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num < 1_000_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  return (num / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
}

export const showComingSoonAlert = (anonymousId, featureName, pathname) => {

  Alert.alert(
    `${featureName} Feature Coming Soon`, // Title of the alert
    "Look for this in a future release.  We've noted you're looking for it.  Thanks!", // Message of the alert
    [
      {
        text: 'OK',
        onPress: () => {
          //console.log('Data Deletion OK Pressed');
          amplitude.track("Coming Soon Popup Displayed", {
            anonymous_id: anonymousId,
            pathname: pathname,
            featureName: featureName
          });
        },
      },
    ],
    { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
  );
};

export const isThingOverdue = (thing) => {
  const scheduled_datetime_utc = thing.scheduled_datetime_utc;
  const utcDateTime = DateTime.fromISO(scheduled_datetime_utc, { zone: "utc" });
  const now = DateTime.now().toUTC();
  return utcDateTime < now;
}

export const timeAgo = (utcDateString) => {
  const date = DateTime.fromISO(utcDateString);
  return date.toRelative();
}

export const momentFromNow = (thing) => {
  const scheduled_datetime_utc = thing.scheduled_datetime_utc;
  return formatLocalizedTime(scheduled_datetime_utc);
}

// export const extractDateInLocalTZ = (dateObj) => {
//   if (dateObj) {
//     return DateTime.fromJSDate(dateObj).toLocal().toFormat("EEE, MMM d, yyyy");
//   } else {
//     return "No date found";
//   }
// }

export const extractDateInLocalTZ = (date) => {
  const inputDate = DateTime.fromJSDate(date).startOf('day');
  const today = DateTime.now().startOf('day');
  const tomorrow = today.plus({ days: 1 });

  if (inputDate.equals(today)) {
    return "Today";
  } else if (inputDate.equals(tomorrow)) {
    return "Tomorrow";
  } else {
    return inputDate.toFormat("EEE, MMM d") + getOrdinalSuffix(inputDate.day) + inputDate.toFormat(" yyyy");
  }
}

function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return "th"; // Special case for 11th, 12th, 13th
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export const extractTimeInLocalTZ = (dateObj) => {
  if (dateObj) {
    return DateTime.fromJSDate(dateObj).toLocal().toFormat("h:mm a");
  } else {
    return "No time found";
  }
}

export const deriveAlertMinutesOffset = (thing) => {
  return getAlertMinutes(thing.scheduled_datetime_utc);
}

export const getLocalDateObj = (thing) => {

  const scheduled_datetime_utc = thing.scheduled_datetime_utc;

  // Parse the UTC ISO string as a Luxon DateTime in UTC
  const dateTimeInUTC = DateTime.fromISO(scheduled_datetime_utc, { zone: 'utc' });

  // Convert it to the local timezone
  const dateTimeInLocal = dateTimeInUTC.setZone('local');

  // Get the JavaScript Date object
  return dateTimeInLocal.toJSDate();
}

export const areDateObjsEqual = (date1, date2) => {
  const luxonDate1 = DateTime.fromJSDate(date1);
  const luxonDate2 = DateTime.fromJSDate(date2);
  return luxonDate1.equals(luxonDate2);
}

function getAlertMinutes(scheduledISO) {
  const now = DateTime.now();
  const scheduled = DateTime.fromISO(scheduledISO);

  // Calculate the difference in minutes
  const diffInMinutes = scheduled.diff(now, "minutes").minutes;

  // Within 1 hour: Alert 30 minutes prior
  if (diffInMinutes <= 60) {
    return -30; // Alert 30 minutes before
  }

  // Within today but more than 1 hour away: Alert 1 hour prior
  if (scheduled.hasSame(now, "day")) {
    return -60; // Alert 1 hour before
  }

  // Tomorrow: Alert at 11:00 AM on the event day
  if (scheduled.diff(now, "days").days <= 1) {
    const alertTime = scheduled.startOf("day").plus({ hours: 11 });
    return Math.round(alertTime.diff(scheduled, "minutes").minutes); // Negative value
  }

  // Within a week but more than a day: Alert at 11:00 AM the day before
  if (scheduled.diff(now, "days").days <= 7) {
    const alertTime = scheduled.minus({ days: 1 }).startOf("day").plus({ hours: 11 });
    return Math.round(alertTime.diff(scheduled, "minutes").minutes); // Negative value
  }

  // More than a week away: Alert at 11:00 AM 3 days before
  const alertTime = scheduled.minus({ days: 3 }).startOf("day").plus({ hours: 11 });
  return Math.round(alertTime.diff(scheduled, "minutes").minutes); // Negative value
}


function formatLocalizedTime(utcISOString) {
  // Parse the UTC time and localize it to the user's timezone
  const scheduledTime = DateTime.fromISO(utcISOString, { zone: 'utc' }).toLocal();
  const now = DateTime.now().toLocal();

  // Helper to format times
  const formatTime = (dt) => dt.toFormat("h:mma").toLowerCase(); // e.g., "3:30pm"

  // Helper to format dates
  const formatDate = (dt) => dt.toFormat("MMM d"); // e.g., "Dec 14"

  // Helper to format dates with the year
  const formatDateWithYear = (dt) => dt.toFormat("MMM d, yyyy"); // e.g., "Jan 7, 2025"

  // Determine the difference in days
  const daysDifference = scheduledTime.startOf('day').diff(now.startOf('day'), 'days').toObject().days;

  // Format based on proximity
  if (daysDifference === 0) {
    // Same day
    if (scheduledTime.hour >= 19) {
      // 7 PM or later
      return `Tonight ${formatTime(scheduledTime)}`;
    }
    return `Today ${formatTime(scheduledTime)}`;
  } else if (daysDifference === 1) {
    // Tomorrow
    return `Tomorrow ${formatTime(scheduledTime)}`;
  } else if (daysDifference === -1) {
    // Yesterday
    return `Yesterday ${formatTime(scheduledTime)}`;
  } else if (scheduledTime.year !== now.year) {
    // Different year
    if (scheduledTime.hour || scheduledTime.minute) {
      return `${formatDateWithYear(scheduledTime)} ${formatTime(scheduledTime)}`;
    }
    return `${formatDateWithYear(scheduledTime)}`;
  } else if (Math.abs(daysDifference) > 1) {
    // Same year but more than a day away
    if (scheduledTime.hour || scheduledTime.minute) {
      return `${formatDate(scheduledTime)} ${formatTime(scheduledTime)}`;
    }
    return `${formatDate(scheduledTime)}`;
  }
}

export const generateEventCreatedMessage = (calendarName, scheduledUtcIsoString, alertMinutesPrior) => {
  // Parse the scheduled date/time
  const scheduledDate = new Date(scheduledUtcIsoString);

  // Ensure the alert time is always positive for the message
  const absoluteAlertMinutes = Math.abs(alertMinutesPrior);

  // Convert scheduled UTC time to a readable format
  const scheduledDateTime = scheduledDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  // Calculate the alert time in human-readable terms
  let alertTime;
  if (absoluteAlertMinutes < 60) {
    alertTime = `${absoluteAlertMinutes} minutes`;
  } else if (absoluteAlertMinutes < 1440) {
    const hours = Math.floor(absoluteAlertMinutes / 60);
    const minutes = absoluteAlertMinutes % 60;
    alertTime = `${hours} ${hours === 1 ? 'hour' : 'hours'}${minutes > 0 ? ` and ${minutes} minutes` : ''
      }`;
  } else {
    const days = Math.floor(absoluteAlertMinutes / 1440);
    const remainingMinutes = absoluteAlertMinutes % 1440;
    const hours = Math.floor(remainingMinutes / 60);
    alertTime = `${days} ${days === 1 ? 'day' : 'days'}${hours > 0 ? ` and ${hours} ${hours === 1 ? 'hour' : 'hours'}` : ''
      }`;
  }

  // Construct and return the statement
  let message = `A new event has been created in your '${calendarName}' calendar for ${scheduledDateTime} and will remind you ${alertTime} prior.`
  if (Platform.OS == 'android') {
    message += " The event should appear on your calendar within a few minutes."
  }
  return message;
};


export const generateCalendarUri = (startDate) => {
  const date = new Date(startDate);

  console.log("URI Date: " + date);
  if (Platform.OS === 'android') {
    return `content://com.android.calendar/time/${date.getTime()}`;
  } else if (Platform.OS === 'ios') {
    const dateTime = DateTime.fromISO(startDate);
    console.log("URI dateTime: " + dateTime);
    const timestampInSeconds = Math.floor(dateTime.toMillis() / 1000);
    console.log("URI timestampInSeconds: " + timestampInSeconds);
    const calshowURI = `calshow:${timestampInSeconds}`;
    return calshowURI;
  }
  return null; // Unsupported platform
}

export const calculateAndroidButtonScale = (audioLevel) => {
  // Define the input range and output range
  const minAudioLevel = -50; // Silent
  const maxAudioLevel = 0;   // Normal speaking voice

  const minScale = 1;   // No growth
  const maxScale = 1.5; // 50% growth

  // Clamp the audio level to the defined range
  const clampedAudioLevel = Math.max(minAudioLevel, Math.min(maxAudioLevel, audioLevel));

  // Map the audio level to the scale range
  const scale = minScale + (clampedAudioLevel - minAudioLevel) / (maxAudioLevel - minAudioLevel) * (maxScale - minScale);

  return scale;
}

export const generateNewKeyboardEntry = () => {
  const newItem = {
    uuid: uuid.v4(),
    text: null,
    parent_item_uuid: null,
    scheduled_datetime_utc: null,
    userReactions: [],
    newKeyboardEntry: true
  };
  return newItem;
}

export const calculateTextInputRowHeight = (text_or_textInput_height) => {
  return text_or_textInput_height + 31;             // LAST UPDATED 12.13.24:  This height prevents the debug background red from appearing 
}

export const fetchWithRetry = async (backendServiceCall, maxRetries = 5, retryDelay = 5000) => {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const response = await backendServiceCall();

      if (response.statusCode == 200) {
        // Exit the retry loop on success
        return response.body; // Or process the response as needed
      }

      console.log(`Attempt ${attempts + 1} failed. Retrying...`);
    } catch (error) {
      console.error(`Attempt ${attempts + 1} encountered an error:`, error);
    }

    attempts += 1;

    if (attempts < maxRetries) {
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  // If we exhaust retries, throw an error
  throw new Error(`Failed to fetch after ${maxRetries} attempts`);
};

export const generateCurrentTimeAPIHeaders = () => {

  // Generate user time info to pass to the API for handling of any scheduled tasks
  const currentDate = new Date();
  const userLocalTime = currentDate.toLocaleString(undefined, {
    weekday: 'long', // Include the weekday (e.g., "Monday")
    year: 'numeric',
    month: 'long', // Full month name (e.g., "December")
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short' // Include timezone abbreviation
  });
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const utcDateTime = currentDate.toISOString();

  return {
    userlocaltime: userLocalTime,
    usertimezone: userTimeZone,
    utcdatetime: utcDateTime
  };
}

// Safely insert the items of one array into another after a specified index, 
// you can use JavaScript's array slicing and concatenation methods
export function insertArrayAfter(array, itemsToInsert, index) {
  // Ensure index is within bounds
  if (index < 0) index = -1; // Adjust so items are inserted at the start when index < 0
  if (index >= array.length) index = array.length - 1; // Adjust so items are appended when index is out of bounds

  // Use slicing and concatenation to insert items after the index
  return [
    ...array.slice(0, index + 1), // Elements up to and including the specified index
    ...itemsToInsert,            // Elements to insert
    ...array.slice(index + 1),   // Elements after the specified index
  ];
}

export function capitalizeFirstCharacter(word) {
  if (typeof word !== 'string' || word.length === 0) {
    return ''; // Return an empty string for invalid input
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function pluralize(word, count) {
  return `${count} ${count === 1 ? word : word + 's'}`;
}

export const deleteFile = async (fileUri: string) => {
  try {
    // Check if the file exists
    const fileExists = await RNFS.exists(fileUri);

    if (fileExists) {
      // Delete the file
      await RNFS.unlink(fileUri);
      //console.log('File deleted successfully');
    } else {
      //console.log('File does not exist');
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Duplicated DootooList constants to stop cyclical reference warning
export const THINGNAME_ITEM = "item";
export const THINGNAME_DONE_ITEM = "done_item";
export const stringizeThingName = (thingName) => {
  if (thingName == THINGNAME_DONE_ITEM || thingName == THINGNAME_ITEM) {
    return "item";
  } else {
    return thingName;
  }
}

export const generateReactionCountObject = (userReactions) => {
  return userReactions.reduce((acc, { reaction }) => {
    acc[reaction.name] = (acc[reaction.name] || 0) + 1;
    return acc;
  }, {});
}
