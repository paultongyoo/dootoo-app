import * as amplitude from '@amplitude/analytics-react-native';
import { trackClickstream } from './Storage';

export const trackEvent = (eventName, eventProperties) => {
    console.log("Tracking: " + eventName + ", properties: " + JSON.stringify(eventProperties));
    if (!__DEV__) {
        trackClickstream(eventName, eventProperties);
    }
    amplitude.track(eventName, eventProperties);
  }