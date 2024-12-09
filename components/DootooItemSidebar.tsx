import { View, Text, Image, ActivityIndicator, Pressable } from 'react-native';
import { formatNumber } from './Helpers';
import Toast from 'react-native-toast-message';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from './AppContext';
import { usePathname, useRouter } from 'expo-router';
import { LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, ListItemEventEmitter } from "@/components/EventEmitters";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { flushTipsCache } from './Storage';

const DootooItemSidebar = ({ thing, styles, disabled = false }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { setSelectedItem, itemCountsMap } = useContext(AppContext);
    const TIPS_PATHNAME = '/meDrawer/communityDrawer/stack/tips';
    const [tipCount, setTipCount] = 
        useState((itemCountsMap.current && itemCountsMap.current.get(thing.uuid)) ? itemCountsMap.current.get(thing.uuid).tip_count : null);
    const [similarCount, setSimilarCount] = 
        useState((itemCountsMap.current && itemCountsMap.current.get(thing.uuid)) ? itemCountsMap.current.get(thing.uuid).similar_count : null);

    // Update v1.1.1:  Experimenting with not displaying loading anim on item level now that race condition is solved
    const [loading, setLoading] = useState(false);

    // const opacitySV = useSharedValue(1);
    // const opacityAnimatedStyle = useAnimatedStyle(() => {
    //     return { opacity: opacitySV.value }
    // })

    useEffect(() => {
        //console.log("Inside useEffect([]) " + thing.text + " " + Date.now());

        const eventHandler_countsPolled = ListItemEventEmitter.addListener(LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, (uuidArray) => {
            if (itemCountsMap.current && uuidArray.includes(thing.uuid)) {
                const updatedCounts = itemCountsMap.current.get(thing.uuid);
                setTipCount(updatedCounts.tip_count);
                setSimilarCount(updatedCounts.similar_count); 
                // opacitySV.value = withTiming(1, {
                //     duration: 300
                // });
            }
        });

        return () => {
            eventHandler_countsPolled.remove();
            // opacitySV.value = withTiming(0, {
            //     duration: 300
            // });
        }
    }, []);

    const handleSimilarCountTap = () => {
        Toast.show({
            type: 'msgOnlyToast',
            text1: `${similarCount} ${(similarCount > 1) ? 'people' : 'person'} did similar thing`,
            position: 'bottom',
            bottomOffset: 220,
            props: {
                width: 230
            }
        });
    }

    const handleTipCountTap = () => {
        if (thing.is_done) {
            goToTips();
        } else {
            flushTipsCache(thing.uuid, goToTips);
        }
    }

    const goToTips = () => {
        setSelectedItem(thing);
        router.push(TIPS_PATHNAME);
    }

    // Update v1.1.1:  Experimenting with not displaying loading anim on item level now that race condition is solved
    if (loading) {
        return (
            <View style={styles.itemCountsRefreshingAnimContainer}>
                <ActivityIndicator size={"small"} color="#3E3723" />
            </View>
        );
    } else {
        return (
            <Animated.View style={[/*opacityAnimatedStyle,*/ { flexDirection: 'row' }]}>
                {(tipCount || thing.is_done) ?
                    <Pressable hitSlop={{ top: 10, bottom: 10, left: 10 }}
                        disabled={disabled || (pathname == TIPS_PATHNAME)}
                        style={styles.tipCountContainer}
                        onPress={() => handleTipCountTap()}>
                        <Text style={styles.tipCountText}>{formatNumber(tipCount) || '0'}</Text>
                        <Image style={styles.tipCountImageIcon} source={require("@/assets/images/light_bulb_556B2F.png")} />
                        {/* <View style={styles.tipCountIcon}></View> */}
                    </Pressable> : <></>}
                {(similarCount) ?
                    <Pressable hitSlop={{ top: 10, bottom: 10, right: 10 }}
                        disabled={disabled}
                        style={styles.similarCountContainer}
                        onPress={() => handleSimilarCountTap()}>
                        <Text style={styles.similarCountText}>{formatNumber(similarCount)}</Text>
                        <Image style={styles.similarCountIcon} source={require("@/assets/images/person_icon_556B2F.png")} />
                    </Pressable> : <></>}
            </Animated.View>
        );
    }
};

export default DootooItemSidebar;