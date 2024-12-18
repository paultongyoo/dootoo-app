import { View, Text, Image, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { formatNumber } from './Helpers';
import Toast from 'react-native-toast-message';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from './AppContext';
import { usePathname, useRouter } from 'expo-router';
import { LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, ListItemEventEmitter } from "@/components/EventEmitters";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { flushTipsCache } from './Storage';
import * as amplitude from '@amplitude/analytics-react-native';
import { Bulb } from './svg/bulb';
import { UserRound } from './svg/user-round';


const DootooItemSidebar = ({ thing, styles, disabled = false }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { anonymousId, setSelectedItem, itemCountsMap } = useContext(AppContext);
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
        amplitude.track(`Item Similar Count Tapped`, {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: thing.uuid,
            similarCount: similarCount,
            tipCount: tipCount
        });

        Toast.show({
            type: 'msgWithLink',
            text1: `${similarCount} ${(similarCount > 1) ? 'people' : 'person'} had similar thing`,
            position: 'bottom',
            bottomOffset: 220,
            props: {
                width: 230
            }
        });
    }

    const handleTipCountTap = () => {
        amplitude.track(`Item Tip Count Tapped`, {
            anonymous_id: anonymousId.current,
            pathname: pathname,
            uuid: thing.uuid,
            similarCount: similarCount,
            tipCount: tipCount
        });

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

    const sidebarStyles = StyleSheet.create({
        itemCountsRefreshingAnimContainer: {
            justifyContent: 'center'
        },
        similarCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            paddingLeft: 15
          },
          similarCountText: {
            fontSize: 15,
            marginRight: 10
          },
          tipCountText: {
            fontSize: 15,
            marginRight: 8
          },
          tipCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row'
          },
    })

    // Update v1.1.1:  Experimenting with not displaying loading anim on item level now that race condition is solved
    if (loading) {
        return (
            <View style={sidebarStyles.itemCountsRefreshingAnimContainer}>
                <ActivityIndicator size={"small"} color="#3E3723" />
            </View>
        );
    } else {
        return (
            <Animated.View style={[/*opacityAnimatedStyle,*/ { flexDirection: 'row' }]}>
                {(tipCount || thing.is_done) ?
                    <Pressable hitSlop={{ top: 10, bottom: 10, left: 10 }}
                        disabled={disabled || (pathname == TIPS_PATHNAME)}
                        style={sidebarStyles.tipCountContainer}
                        onPress={() => handleTipCountTap()}>
                        <Text style={sidebarStyles.tipCountText}>{formatNumber(tipCount) || '0'}</Text>
                        <Bulb wxh="20" opacity="0.8" color="#556B2F" />
                    </Pressable> : <></>}
                {(similarCount) ?
                    <Pressable hitSlop={{ top: 10, bottom: 10, right: 10 }}
                        disabled={disabled}
                        style={sidebarStyles.similarCountContainer}
                        onPress={() => handleSimilarCountTap()}>
                        <Text style={sidebarStyles.similarCountText}>{formatNumber(similarCount)}</Text>
                        <UserRound wxh="18" opacity="0.8" color="#556B2F" />
                    </Pressable> : <></>}
            </Animated.View>
        );
    }
};

export default DootooItemSidebar;