import { View, Text, Image, ActivityIndicator, Pressable } from 'react-native';
import { formatNumber } from './Helpers';
import Toast from 'react-native-toast-message';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from './AppContext';
import { usePathname, useRouter } from 'expo-router';
import { loadItemCounts } from './Storage';
import { LIST_ITEM_EVENT__DONE_STATE_CHANGED, LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, ListItemEventEmitter } from "@/components/EventEmitters";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const DootooItemSidebar = ({ thing, styles }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { setSelectedItem, itemCountsMap } = useContext(AppContext);
    const TIPS_PATHNAME = '/meDrawer/communityDrawer/stack/tips';
    const [tipCount, setTipCount] = 
        useState((itemCountsMap.current.get(thing.uuid) ? itemCountsMap.current.get(thing.uuid).tip_count : 99));
    const [similarCount, setSimilarCount] = 
        useState((itemCountsMap.current.get(thing.uuid) ? itemCountsMap.current.get(thing.uuid).similar_count : 99));

    // Update v1.1.1:  Experimenting with not displaying loading anim on item level now that race condition is solved
    const [loading, setLoading] = useState(false);

    // const opacitySV = useSharedValue(1);
    // const opacityAnimatedStyle = useAnimatedStyle(() => {
    //     return { opacity: opacitySV.value }
    // })

    useEffect(() => {
        //console.log("Inside useEffect([]) " + thing.text + " " + Date.now());
        let ignore = false;

        // PT  Latest approach for Rel v1.1.1:  
        //    - Not displaying loading animation now that counts
        //      should be able to safely update without causing
        //      race condition that causes list to jump around
        //    - Components now update their counts on every update of thing
        //      object, which I believe is appropriate
        //    - Leaving loading animation code in place in case we learn
        //      we need it later

        // const eventHandler_doneStateChanged = ListItemEventEmitter.addListener(LIST_ITEM_EVENT__DONE_STATE_CHANGED, (data) => {
        //     if (data.uuid == thing.uuid) {
        //         //console.log("Setting loading to true for thing: " + thing.text + " " + Date.now());
        //         setLoading(true);
        //         fetchCounts();
        //     }
        // });

        const eventHandler_countsPolled = ListItemEventEmitter.addListener(LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, (uuidArray) => {
            if (uuidArray.includes(thing.uuid)) {
                const updatedCounts = itemCountsMap.current.get(thing.uuid);
                setTipCount(updatedCounts.tip_count);
                setSimilarCount(updatedCounts.similar_count); 
                // opacitySV.value = withTiming(1, {
                //     duration: 300
                // });
            }
        });

        const fetchCounts = async () => {
            const itemCounts = await loadItemCounts(thing.uuid);
            if (!ignore) {
                //console.log(`Updating counts ${thing.text}: ${JSON.stringify(itemCounts)} ${Date.now()}`);
                setTipCount(itemCounts.tip_count);
                setSimilarCount(itemCounts.similar_count);
                setLoading(false);
                // opacitySV.value = withTiming(1, {
                //     duration: 300
                // });
            } else {
                //console.log("Discarding fetch attempt to avoid race condition " + Date.now());
            }
        }
        const eventHandler_afterSave = ListItemEventEmitter.addListener('items_saved', () => {
            console.log("Calling fetch counts on 'items_saved' event: " + thing.text);
            fetchCounts();
        });
        const eventHandler_doneStateChanged = ListItemEventEmitter.addListener(LIST_ITEM_EVENT__DONE_STATE_CHANGED, (data) => {
            if (data.uuid == thing.uuid) {
                console.log("Calling fetch counts on 'done_state_changed' event: " + thing.text);
                setLoading(true);
                fetchCounts();
            }
        });

        return () => {
            //console.log("Cleaning up DootooItemSidebar useEffect " + Date.now());
            ignore = true;
            eventHandler_countsPolled.remove();
            eventHandler_doneStateChanged.remove();
            eventHandler_afterSave.remove();
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
                {(tipCount) ?
                    <Pressable hitSlop={{ top: 10, bottom: 10, left: 10 }}
                        disabled={pathname == TIPS_PATHNAME}
                        style={styles.tipCountContainer}
                        onPress={() => handleTipCountTap()}>
                        <Text style={styles.tipCountText}>{formatNumber(tipCount) || '0'}</Text>
                        <Image style={styles.tipCountImageIcon} source={require("@/assets/images/light_bulb_556B2F.png")} />
                        {/* <View style={styles.tipCountIcon}></View> */}
                    </Pressable> : <></>}
                {(similarCount) ?
                    <Pressable hitSlop={{ top: 10, bottom: 10, right: 10 }}
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