import { Platform, View, StyleSheet, Text } from "react-native";
import { useRef, useEffect } from "react";
import mobileAds, { BannerAd, TestIds, useForeground, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import * as amplitude from '@amplitude/analytics-react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NavigationSections from "./NavigationSections";

const DootooFooter = ({ state, descriptors, navigation }) => {

    const pathname = usePathname();

    const bannerAdId = __DEV__ ?
        TestIds.ADAPTIVE_BANNER :
        (Platform.OS === 'ios' ? "ca-app-pub-6723010005352574/5609444195" :
            "ca-app-pub-6723010005352574/8538859865");
    const bannerRef = useRef<BannerAd>(null);

    const opacity = useSharedValue(0);

    const ITEMS_PATHNAME = "/list";

 
    useEffect(() => {
        initializeMobileAds();
        //console.log(`Pathname: ${pathname}`);
        if (pathname == ITEMS_PATHNAME) {
            //console.log("Attempting to animate footer in...");
            opacity.value = withTiming(1, {
                duration: 500
            });
        }
    }, [pathname]);

    useForeground(() => {
        Platform.OS === 'ios' && bannerRef.current?.load();
    })

    const initializeMobileAds = async () => {
        const adapterStatuses = await mobileAds().initialize();
    }

    const insets = useSafeAreaInsets();
    const styles = StyleSheet.create({
        footerContainer: {

            // height: 170,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: "#c0c0c0"
        },
        navigationContainer: {
            width: '100%',
            backgroundColor: '#FAF3E0',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: "#00000033",
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 4 // Elevation for Android      
        },
        bannerAdContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 20,
            paddingBottom: (insets.bottom && insets.bottom > 0) ? insets.bottom : 10
        },
        bannerAdCopyContainer: {
            alignItems: 'center',
            paddingBottom: 5
        },
        bannerAdCopy: {
            color: '#808080',
            fontSize: 12,
            letterSpacing: 1
        }
    });

    return (
        <>
            <View style={styles.footerContainer}>
                <View style={styles.navigationContainer}>
                    <NavigationSections navigation={navigation} />
                </View>
                <View style={styles.bannerAdContainer}>
                    <View style={styles.bannerAdCopyContainer}>
                        <Text style={styles.bannerAdCopy}>ADVERTISEMENT</Text>
                    </View>
                    <BannerAd ref={bannerRef} unitId={bannerAdId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                        onPaid={() => amplitude.track("Banner Ad Paid")}
                        onAdLoaded={() => amplitude.track("Banner Ad Loaded")}
                        onAdOpened={() => amplitude.track("Banner Ad Opened")}
                        onAdFailedToLoad={() => amplitude.track("Banner Ad Failed to Load")} />
                </View>
            </View>
        </>
    );
};

export default DootooFooter;