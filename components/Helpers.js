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
  return formatRelativeTimeDetailed(scheduled_datetime_utc);
}

function formatRelativeTimeDetailed(scheduledTimeISO) {
  const now = DateTime.now().toUTC();
  const scheduledTime = DateTime.fromISO(scheduledTimeISO, { zone: "utc" });

  // Calculate the total difference in milliseconds
  const diffMilliseconds = scheduledTime.diff(now).milliseconds;

  // Determine if the scheduled time is in the past or future
  const isPast = diffMilliseconds < 0;

  // Calculate the absolute difference
  const totalMinutes = Math.abs(diffMilliseconds) / (1000 * 60);
  const totalHours = totalMinutes / 60;
  const totalDays = totalHours / 24;
  const totalWeeks = totalDays / 7;
  const totalMonths = totalDays / 30; // Approximation
  const totalYears = totalDays / 365; // Approximation

  let timeString;

  // Helper function to handle singular/plural
  const formatUnit = (value, unit) => `${value} ${unit}${value === 1 ? '' : 's'}`;

  // Choose the appropriate unit
  if (totalYears >= 1) {
    const years = Math.floor(totalYears);
    const remainingMonths = Math.floor((totalYears - years) * 12);
    timeString = `${formatUnit(years, 'year')}${remainingMonths > 0 ? ` and ${formatUnit(remainingMonths, 'month')}` : ''}`;
  } else if (totalMonths >= 1) {
    const months = Math.floor(totalMonths);
    const remainingDays = Math.floor((totalMonths - months) * 30);
    timeString = `${formatUnit(months, 'month')}${remainingDays > 0 ? ` and ${formatUnit(remainingDays, 'day')}` : ''}`;
  } else if (totalWeeks >= 1) {
    const weeks = Math.floor(totalWeeks);
    const remainingDays = Math.floor((totalWeeks - weeks) * 7);
    timeString = `${formatUnit(weeks, 'week')}${remainingDays > 0 ? ` and ${formatUnit(remainingDays, 'day')}` : ''}`;
  } else if (totalDays >= 1) {
    const days = Math.floor(totalDays);
    const remainingHours = Math.floor((totalDays - days) * 24);
    timeString = `${formatUnit(days, 'day')}${remainingHours > 0 ? ` and ${formatUnit(remainingHours, 'hour')}` : ''}`;
  } else {
    const hours = Math.floor(totalHours);
    const remainingMinutes = Math.floor(totalMinutes % 60);
    timeString = `${formatUnit(hours, 'hour')}${remainingMinutes > 0 ? ` and ${formatUnit(remainingMinutes, 'minute')}` : ''}`;
  }

  // Add "in" or "ago" based on the direction of the difference
  timeString = isPast ? `${timeString} ago` : `in ${timeString}`;

  return timeString;
}
