import { Alert, Platform } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';
import { DateTime } from 'luxon';

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
    alertTime = `${hours} ${hours === 1 ? 'hour' : 'hours'}${
      minutes > 0 ? ` and ${minutes} minutes` : ''
    }`;
  } else {
    const days = Math.floor(absoluteAlertMinutes / 1440);
    const remainingMinutes = absoluteAlertMinutes % 1440;
    const hours = Math.floor(remainingMinutes / 60);
    alertTime = `${days} ${days === 1 ? 'day' : 'days'}${
      hours > 0 ? ` and ${hours} ${hours === 1 ? 'hour' : 'hours'}` : ''
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