import { Alert } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';
import moment from 'moment';

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

  const scheduled_date = thing.scheduled_date;
  const scheduled_time = thing.scheduled_time

  // Combine date and time into a single datetime string
  const scheduledDateTimeStr = `${scheduled_date} ${scheduled_time}`;

  // Parse the combined string into a Moment.js datetime object
  const scheduledDateTime = moment(scheduledDateTimeStr, "YYYY-MM-DD HH:mm:ss");

  // Get the current datetime
  const currentDateTime = moment();

  // Check if the scheduled datetime is in the past
  return scheduledDateTime.isBefore(currentDateTime)
}

