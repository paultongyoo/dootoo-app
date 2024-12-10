import { Alert } from "react-native";
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
