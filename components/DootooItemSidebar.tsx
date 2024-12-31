import { View, Text, Platform, ActivityIndicator, Pressable, StyleSheet, Alert } from 'react-native';
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
import { UsersRound } from './svg/users-round';


const DootooItemSidebar = ({ thing, disabled = false }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { anonymousId, setSelectedItem, itemCountsMap } = useContext(AppContext);

    const TIPS_PATHNAME = '/(tabs)/tips';

    const [tipCount, setTipCount] = 
        useState((itemCountsMap.current && itemCountsMap.current.get(thing.uuid)) ? itemCountsMap.current.get(thing.uuid).tip_count : null);
    const [similarCount, setSimilarCount] = 
        useState((itemCountsMap.current && itemCountsMap.current.get(thing.uuid)) ? itemCountsMap.current.get(thing.uuid).similar_count : null);

    const [isPublic, setIsPublic] = useState(thing.is_public == true);

    // Update v1.1.1:  Experimenting with not displaying loading anim on item level now that race condition is solved
    const [loading, setLoading] = useState(false);

    // const opacitySV = useSharedValue(1);
    // const opacityAnimatedStyle = useAnimatedStyle(() => {
    //     return { opacity: opacitySV.value }
    // })

    // 1.7 TODO: Reactivate on community reaction count updates
    // useEffect(() => {
    //     //console.log("Inside useEffect([]) " + thing.text + " " + Date.now());

    //     const eventHandler_countsPolled = ListItemEventEmitter.addListener(LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, (uuidArray) => {
    //         if (itemCountsMap.current && uuidArray.includes(thing.uuid)) {
    //             const updatedCounts = itemCountsMap.current.get(thing.uuid);
    //             setTipCount(updatedCounts.tip_count);
    //             setSimilarCount(updatedCounts.similar_count); 
    //             // opacitySV.value = withTiming(1, {
    //             //     duration: 300
    //             // });
    //         }
    //     });

    //     return () => {
    //         eventHandler_countsPolled.remove();
    //         // opacitySV.value = withTiming(0, {
    //         //     duration: 300
    //         // });
    //     }
    // }, []);

    const handleIsPublicTap = () => {
        setIsPublic(prevVal => !prevVal);
    }

    const sidebarStyles = StyleSheet.create({
        itemCountsRefreshingAnimContainer: {
            justifyContent: 'center'
        },
        isPublicContainer: {

        }
    })

    // Update v1.1.1:  Experimenting with not displaying loading anim on item level now that race condition is solved
    if (loading) {
        return (
            <View style={sidebarStyles.itemCountsRefreshingAnimContainer}>
                <ActivityIndicator size={"small"} color="#3E3723" />
            </View>
        );
    } else {
        const greenColorSV = useSharedValue("#556B2F")

        if (!thing.parent_item_uuid) {
            return (
                <Animated.View style={[/*opacityAnimatedStyle,*/ { flexDirection: 'row' }]}>
                    <Pressable hitSlop={{ top: 10, bottom: 10, left: 10 }}
                        style={sidebarStyles.isPublicContainer}
                        onPress={() => handleIsPublicTap()}>
                        <UsersRound 
                            wxh="20" 
                            opacity={(isPublic) ? "1.0" : "0.3"}
                            color={greenColorSV} />
                    </Pressable> 
                </Animated.View> 
            );
        } else {
            return <></>
        }
    }
};

export default DootooItemSidebar;