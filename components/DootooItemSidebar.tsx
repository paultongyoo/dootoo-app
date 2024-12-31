import { View, ActivityIndicator, Pressable, StyleSheet, Alert } from 'react-native';
import { useContext, useState } from 'react';
import { AppContext } from './AppContext';
import { usePathname } from 'expo-router';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { updateItemPublicState } from './Storage';
import * as amplitude from '@amplitude/analytics-react-native';
import { UsersRound } from './svg/users-round';


const DootooItemSidebar = ({ thing }) => {
    const pathname = usePathname();
    const { anonymousId } = useContext(AppContext);

    const [isPublic, setIsPublic] = useState(thing.is_public == true);

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
        amplitude.track("Item Go Public Prompt Displayed", {
            anonymous_id: anonymousId,
            pathname: pathname
        });
        if (!isPublic) {
            Alert.alert(
                "Share Item with the Community?",
                "Share this item on the Community Feed to stay motivated, get support, and inspire others working on similar goals.",
                [
                    {
                        text: 'Cancel',
                        onPress: () => {
                            amplitude.track("Item Go Public Prompt Cancelled", {
                                anonymous_id: anonymousId,
                                pathname: pathname
                            });
                        },
                        style: 'cancel'
                    },
                    {
                        text: 'Yes',
                        onPress: async () => {
                            amplitude.track("Item Go Public Prompt Approved", {
                                anonymous_id: anonymousId,
                                pathname: pathname
                            });
                            setIsPublic(true);
                            updateItemPublicState(thing.uuid, true);                          
                            Alert.alert(
                                "Item Posted to the Community",
                                "Thanks for sharing.  Let's get to work!",
                                [
                                    {
                                        text: 'Go to Post',
                                        onPress: () => {
                                            amplitude.track("Item Go Public Success: Went to Post", {
                                                anonymous_id: anonymousId,
                                                pathname: pathname
                                            });
                                        }
                                    },
                                    {
                                        text: 'Close',
                                        onPress: () => {
                                            amplitude.track("Item Go Public Success: Closed", {
                                                anonymous_id: anonymousId,
                                                pathname: pathname
                                            });                                           
                                        },
                                    }
                                ]
                            )
                        },
                    },
                ]
            )
        } else {
            amplitude.track("Item Hide from Public Prompt Displayed", {
                anonymous_id: anonymousId,
                pathname: pathname
            });
            Alert.alert(
                "Hide Item from the Community?",
                "The item will no longer display in the Community Feed. ",
                [
                    {
                        text: 'Cancel',
                        onPress: () => {
                            amplitude.track("Item Hide from Public Prompt Cancelled", {
                                anonymous_id: anonymousId,
                                pathname: pathname
                            });
                        },
                        style: 'cancel'
                    },
                    {
                        text: 'Yes',
                        onPress: () => {
                            amplitude.track("Item Hide from Public Prompt Approved", {
                                anonymous_id: anonymousId,
                                pathname: pathname
                            });
                            setIsPublic(false);
                            updateItemPublicState(thing.uuid, false);
                        },
                    },
                ]
            )
        }
    }

    const sidebarStyles = StyleSheet.create({
        itemCountsRefreshingAnimContainer: {
            justifyContent: 'center'
        },
        isPublicContainer: {

        }
    })

    const greenColorSV = useSharedValue("#556B2F")

    if (!thing.parent_item_uuid) {
        return (
            <Animated.View style={[{ flexDirection: 'row' }]}>
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
};

export default DootooItemSidebar;