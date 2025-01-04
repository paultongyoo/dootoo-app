import { View, ActivityIndicator, Pressable, StyleSheet, Alert } from 'react-native';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from './AppContext';
import { useNavigation, usePathname } from 'expo-router';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { updateItemPublicState } from './Storage';
import * as amplitude from '@amplitude/analytics-react-native';
import { UsersRound } from './svg/users-round';
import { LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE, ListItemEventEmitter, NAVIGATION_EVENT__GO_TO_SECTION, NavigationEventEmitter } from './EventEmitters';
import { ReactionsDisplay } from './ReactionsDisplay';
import { NAVIGATION_SECTION_IDX_COMMUNITY } from './Constants';


const DootooItemSidebar = ({ thing, onReactionsPress }) => {
   
    const pathname = usePathname();
    const { anonymousId, setOpenItems } = useContext(AppContext);

    const [isPublic, setIsPublic] = useState(thing.is_public == true);

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
                        }
                    },
                    {
                        text: 'Yes',
                        onPress: async () => {
                            amplitude.track("Item Go Public Prompt Approved", {
                                anonymous_id: anonymousId,
                                pathname: pathname
                            });
                            
                            setOpenItems(prevItems => prevItems.map((prevItem) => 
                                (prevItem.uuid == thing.uuid)
                                    ? { ...prevItem, is_public: true }
                                    : prevItem  ));
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
                                            NavigationEventEmitter.emit(NAVIGATION_EVENT__GO_TO_SECTION, NAVIGATION_SECTION_IDX_COMMUNITY);
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
                        }
                    }
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
                            
                            setOpenItems(prevItems => prevItems.map((prevItem) => 
                                (prevItem.uuid == thing.uuid)
                                    ? { ...prevItem, is_public: false }
                                    : prevItem  ));                            
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