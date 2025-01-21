import * as amplitude from '@amplitude/analytics-react-native';
import { trackClickstream } from './Storage';

export const trackEvent = (eventName, eventProperties) => {
    const appVersion = '1.7.2';
    const clickStreamProps = { 
        app_version: appVersion, 
        ...eventProperties
    };
    console.log("Tracking: " + eventName + ", appendedProps: " + JSON.stringify(clickStreamProps));
    if (!__DEV__) {
        trackClickstream(eventName, clickStreamProps);
    }
    amplitude.track(eventName, eventProperties);
  }