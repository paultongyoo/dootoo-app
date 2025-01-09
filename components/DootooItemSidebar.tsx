import { ActivityIndicator, Pressable, StyleSheet, Alert } from 'react-native';
import { useContext, useState } from 'react';
import { AppContext } from './AppContext';
import { usePathname } from 'expo-router';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { updateItemPublicState } from './Storage';
import * as amplitude from '@amplitude/analytics-react-native';
import { UsersRound } from './svg/users-round';
import { NAVIGATION_EVENT__GO_TO_SECTION, NavigationEventEmitter } from './EventEmitters';
import { ReactionsDisplay } from './ReactionsDisplay';
import { NAVIGATION_SECTION_IDX_COMMUNITY } from './Constants';


const DootooItemSidebar = ({ thing, onReactionsPress }) => {
   
    const pathname = usePathname();
    const { anonymousId, username, setOpenItems, setDoneItems, refreshCommunityItems } = useContext(AppContext);

    const [loading, setLoading] = useState(false);

    const handleIsPublicTap = () => {
        amplitude.track("Item Go Public Prompt Displayed", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        if (!thing.is_public) {
            Alert.alert(
                "Share Item with the Community?",
                "Share this item on the Community Feed to stay motivated, get support, and inspire others working on similar goals.",
                [
                    {
                        text: 'Cancel',
                        onPress: () => {
                            amplitude.track("Item Go Public Prompt Cancelled", {
                                anonymous_id: anonymousId,
                                username: username,
                                pathname: pathname
                            });
                        }
                    },
                    {
                        text: 'Yes',
                        onPress: async () => {
                            amplitude.track("Item Go Public Prompt Approved", {
                                anonymous_id: anonymousId,
                                username: username,
                                pathname: pathname
                            });

                            setLoading(true);
                            
                            if (thing.is_done) {
                                setDoneItems(prevItems => prevItems.map((prevItem) => 
                                    (prevItem.uuid == thing.uuid)
                                        ? { ...prevItem, is_public: true }
                                        : prevItem  ));
                            } else {
                                setOpenItems(prevItems => prevItems.map((prevItem) => 
                                    (prevItem.uuid == thing.uuid)
                                        ? { ...prevItem, is_public: true }
                                        : prevItem  ));
                            }
                            updateItemPublicState(thing.uuid, true, () => {
                                setLoading(false);

                                refreshCommunityItems();

                                Alert.alert(
                                    "Item Posted to the Community",
                                    "Thanks for sharing.  Let's get to work!",
                                    [
                                        {
                                            text: 'Go to Post',
                                            onPress: () => {
                                                amplitude.track("Item Go Public Success: Went to Post", {
                                                    anonymous_id: anonymousId,
                                                    username: username,
                                                    pathname: pathname
                                                });
                                                NavigationEventEmitter.emit(NAVIGATION_EVENT__GO_TO_SECTION, NAVIGATION_SECTION_IDX_COMMUNITY);
                                            }
                                        },
                                        {
                                            text: 'Close',
                                            onPress: () => {
                                                amplitude.track("Item Go Public Success: Closed", {
                                                    anonymous_id: anonymousId,
                                                    username: username,
                                                    pathname: pathname
                                                });                                           
                                            },
                                        }
                                    ]
                                )
                            });    
                        }
                    }
                ]
            )
        } else {
            amplitude.track("Item Hide from Public Prompt Displayed", {
                anonymous_id: anonymousId,
                username: username,
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
                                username: username,
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

                            setLoading(true);
                            
                            if (thing.is_done) {
                                setDoneItems(prevItems => prevItems.map((prevItem) => 
                                    (prevItem.uuid == thing.uuid)
                                        ? { ...prevItem, is_public: false }
                                        : prevItem  ));   
                            } else {
                                setOpenItems(prevItems => prevItems.map((prevItem) => 
                                    (prevItem.uuid == thing.uuid)
                                        ? { ...prevItem, is_public: false }
                                        : prevItem  ));   
                            }
                            updateItemPublicState(thing.uuid, false, () => {
                                setLoading(false);
                                refreshCommunityItems();
                            });
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

    if (loading) {
        return (
            <ActivityIndicator size="small" color="#3e2723" />
        )
    } else if (!thing.parent_item_uuid && !thing.newKeyboardEntry && !thing.flagged) {
        if (!thing.is_public) {
            return (
                <Animated.View style={[{ flexDirection: 'row', alignItems: 'center' }]}>
                    <Pressable hitSlop={{ top: 10, bottom: 10, left: 10 }}
                        style={sidebarStyles.isPublicContainer}
                        onPress={() => handleIsPublicTap()}>
                        <UsersRound
                            wxh="20"
                            opacity="0.3"
                            color={greenColorSV} />
                    </Pressable>
                </Animated.View>
            );
        } else if (!thing.userReactions || thing.userReactions.length == 0) {
            return (
                <Animated.View style={[{ flexDirection: 'row', alignItems: 'center' }]}>
                    <Pressable hitSlop={{ top: 10, bottom: 10, left: 10 }}
                        style={sidebarStyles.isPublicContainer}
                        onPress={() => handleIsPublicTap()}>
                        <UsersRound
                            wxh="20"
                            opacity="1.0"
                            color={greenColorSV} />
                    </Pressable>
                </Animated.View>
            );
        } else {
            return (
                <ReactionsDisplay reactions={thing.userReactions} onReactionsPress={onReactionsPress} />
            )
        }
    } else {
        return <></>
    }
};

export default DootooItemSidebar;