import { Slot, usePathname } from 'expo-router';
import * as amplitude from '@amplitude/analytics-react-native';
import { useEffect } from 'react';


const AMPLITUDE_KEY_DEV = "28fd28b2a8714bea3efa4a0bc73fbd0b";
const AMPLITUDE_KEY_PROD = "ac9cdda8bd0d54ba50553219f407d353";

export default function Index() {
    const pathname = usePathname();

    useEffect(() => {
        amplitude.init((__DEV__) ? AMPLITUDE_KEY_DEV : AMPLITUDE_KEY_PROD );
    }, []);

    useEffect(() => {
        console.log("Pathname logged: " + pathname);
        amplitude.track('Screen Viewed', {pathname: pathname});
    }, [pathname]);

    return <Slot />;
}

