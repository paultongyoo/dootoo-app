import { AppContext } from "@/components/AppContext";
import { timeAgo } from "@/components/Helpers";
import { loadCommunityItems, updateItemPublicState } from "@/components/Storage";
import { CircleUserRound } from "@/components/svg/circle-user-round";
import { EllipsisVertical } from "@/components/svg/ellipsis-vertical";
import { EyeOff } from "@/components/svg/eye-off";
import { Flag } from "@/components/svg/flag";
import { ThumbUp } from "@/components/svg/thumb-up";
import { useFocusEffect, usePathname } from "expo-router";
import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View, ActivityIndicator, FlatList, Text, Alert, Pressable, RefreshControl } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const CommunityScreen = () => {
    const pathname = usePathname();
    const [communityItems, setCommunityItems] = useState(null);
    const { username, anonymousId, setOpenItems } = useContext(AppContext);
    const communityItemRefs = useRef({});

    const opacity = useSharedValue(0);
    const animatedOpacity = useAnimatedStyle(() => {
        return { opacity: opacity.value }
    })
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const hasMoreItems = useRef(false);
    const nextPageLoadingOpacity = useSharedValue(0);
    const nextPageAnimatedOpacity = useAnimatedStyle(() => {
        return { opacity: nextPageLoadingOpacity.value }
    })

    useFocusEffect(
        useCallback(() => {
            //console.log("Community.useFocusEffect([]), communityItems: " + JSON.stringify(communityItems));
            initializeCommunityScreen();
            return () => {
                //console.log("Setting communityItems back to null on losing focus");
                setCommunityItems(null);
            }
        }, [])
    )

    const initialItemsMount = useRef(true);
    useEffect(() => {
        //console.log("useEffect([communityItems]), length: " + ((communityItems) ? communityItems.length : '<undefined>'));

        if (initialItemsMount.current) {
            initialItemsMount.current = false;
        } else if (opacity.value == 0) {
            const fadeInLayout = async () => {
                await new Promise<void>((resolve) =>
                    opacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                        if (isFinished) {
                            runOnJS(resolve)();
                        }
                    }));
            }
            fadeInLayout();
        }
    }, [communityItems]);

    const initializeCommunityScreen = async () => {
        //console.log("Initializing Community Screen");

        // Fade in layout, which is ASSumed to be displaying loading animation
        await new Promise<void>((resolve) =>
            opacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                if (isFinished) {
                    runOnJS(resolve)();
                }
            }));

        const responseObj = await loadCommunityItems(page);
        hasMoreItems.current = responseObj.hasMore;

        // Fade out layout, which is ASSumed to be displaying loading animation
        await new Promise<void>((resolve) =>
            opacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                if (isFinished) {
                    runOnJS(resolve)();
                }
            }));

        // Update array
        setCommunityItems([...responseObj.items])
    }

    const initialPageMount = useRef(true);
    useEffect(() => {
        if (initialPageMount.current) {
            initialPageMount.current = false;
        } else {
            const updateCommunityPage = async (requestedPage) => {
                const responseObj = await loadCommunityItems(requestedPage);
                hasMoreItems.current = responseObj.hasMore;

                if (requestedPage == 1) {

                    if (responseObj.items.length == 0) {
                        await new Promise<void>((resolve) =>
                            opacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                                if (isFinished) {
                                    runOnJS(resolve)();
                                }
                            }));
                    }

                    setCommunityItems([...responseObj.items])
                } else {

                    await new Promise<void>((resolve) => {
                        nextPageLoadingOpacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                            if (isFinished) {
                                runOnJS(resolve)();
                            }
                        })
                    })

                    setCommunityItems(prevItems => [
                        ...responseObj.items,
                        ...prevItems
                    ]);
                }
                setRefreshing(false);
            }
            updateCommunityPage(page);
        }
    }, [page, refreshKey])

    const refreshList = () => {
        if (page != 1) {
            setPage(1);
        } else {
            setRefreshKey(prevVal => prevVal + 1);
        }
    }

    const loadNextPage = async () => {
        if (hasMoreItems.current) {
            await new Promise<void>((resolve) => {
                nextPageLoadingOpacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                    if (isFinished) {
                        runOnJS(resolve)();
                    }
                })
            })
            setPage(prevPage => prevPage + 1);
        } else {
            //console.log(`Ignoring onEndReached call as user doesn't have more items to return`);
        }
    }

    const styles = StyleSheet.create({
        container: {
            backgroundColor: '#DCC7AA',
            flex: 1
        },
        animatedContainer: {
            flex: 1,
        },
        loadingAnimContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        },
        itemContainer: {
            backgroundColor: "#FAF3E099",
            padding: 10,
            marginTop: 10,
            marginHorizontal: 10,
            borderRadius: 10
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        profile: {
            flexDirection: 'row'
        },
        profileIcon: {

        },
        profileNameContainer: {
            justifyContent: 'center'
        },
        profileNameText: {
            fontSize: 16,
            fontWeight: 'bold',
            paddingLeft: 10
        },
        rightCorner: {
            flexDirection: 'row'
        },
        timeAgoContainer: {

        },
        timeAgo: {
            fontSize: 12,
            color: '#808080'
        },
        moreIconContainer: {
            paddingHorizontal: 5,
            position: 'relative'
        },
        textContainer: {
            marginVertical: 20,
            marginLeft: 10,
            marginRight: 20,
            alignItems: 'flex-start',
            position: 'relative',
            zIndex: 0
        },
        textLine: {
            fontSize: 16
        },
        textSubLine: {
            // flexDirection: 'row',
            position: 'relative',
            paddingLeft: 20,
            alignItems: 'center',
            marginTop: 5
        },
        bullet: {
            fontWeight: 'bold',
            color: "#556B2F",
            position: 'absolute',
            left: 5,
            top: 3
        },
        bottomActions: {
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: "#3E272333",
            marginHorizontal: 10,
            justifyContent: 'center'
        },
        actionContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            padding: 10
        },
        actionLabel: {
            fontWeight: 'bold',
            fontSize: 14,
            color: '#556B2F',
            paddingHorizontal: 10
        },
        emptyListContainer: {
            flex: 1,
            justifyContent: 'center',
            paddingLeft: 30,
            paddingRight: 40
        },
        emptyListText: {
            color: "#3e2723",
            fontSize: 40,
            lineHeight: 48
        },
        moreOverlay: {
            position: 'absolute',
            right: 10,
            backgroundColor: '#FAF3E0',
            borderRadius: 5,
            width: 150,
            paddingHorizontal: 10,
            paddingTop: 20,
            paddingBottom: 5
        },
        moreOverlayOption: {
            flexDirection: 'row',
            marginBottom: 15
        },
        moreOverlayOptionIcon: {
            paddingHorizontal: 5
        },
        moreOverlayOptionTextContainer: {

        },
        moreOverlayOptionText: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#3e2723'
        },
    })

    const RenderItem = forwardRef(({ item, index, separators }, ref) => {

        const [moreOverlayVisible, setMoreOverlayVisible] = useState(false);

        useImperativeHandle(ref, () => ({
            hideMoreMenu: () => {
                setMoreOverlayVisible(false)
            }
        }));

        const handleMoreTap = () => {
            setMoreOverlayVisible(true);
        }

        const handleReact = () => {
            Alert.alert("Implement Reaction for item " + item.text);
        }

        const handleHideFromCommunity = () => {
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

                            setCommunityItems(prevItems => 
                                prevItems.filter(prevItem => prevItem.uuid != item.uuid));                           
                            setOpenItems(prevItems => prevItems.map((prevItem) => 
                                (prevItem.uuid == item.uuid)
                                    ? { ...prevItem, is_public: false }
                                    : prevItem  ));                            
                            updateItemPublicState(item.uuid, false);
                        },
                    },
                ]
            )
        }

        return (
            <View style={styles.itemContainer}>
                <View style={styles.header}>
                    <View style={styles.profile}>
                        <View style={styles.profileIcon}>
                            <CircleUserRound wxh="32" color="#556B2F" />
                        </View>
                        <View style={styles.profileNameContainer}>
                            <Text style={styles.profileNameText}>
                                {item.user.name}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.rightCorner}>
                        <View style={styles.timeAgoContainer}>
                            <Text style={styles.timeAgo}>
                                {timeAgo(item.updatedAt)}
                            </Text>
                        </View>
                        <View style={styles.moreIconContainer}>
                            <Pressable hitSlop={10} onPress={handleMoreTap}>
                                <EllipsisVertical wxh="20" color="#556B2F" />
                            </Pressable>
                            <View style={[styles.moreOverlay,
                            {
                                opacity: (moreOverlayVisible) ? 1 : 0,
                                zIndex: (moreOverlayVisible) ? 99 : -99
                            }]}>
                                {(username == item.user.name)
                                    ? <Pressable hitSlop={10} style={styles.moreOverlayOption}
                                        onPress={handleHideFromCommunity}>
                                        <View style={styles.moreOverlayOptionIcon}>
                                            <EyeOff wxh="20" color="#3e2723" />
                                        </View>
                                        <View style={styles.moreOverlayOptionTextContainer}>
                                            <Text style={styles.moreOverlayOptionText}>Hide from Community</Text>
                                        </View>
                                    </Pressable>
                                    : <>
                                        <Pressable hitSlop={10} style={styles.moreOverlayOption}
                                            onPress={() => Alert.alert("Implement Me")}>
                                            <View style={styles.moreOverlayOptionIcon}>
                                                <EyeOff wxh="20" color="#3e2723" />
                                            </View>
                                            <View style={styles.moreOverlayOptionTextContainer}>
                                                <Text style={styles.moreOverlayOptionText}>Hide User</Text>
                                            </View>
                                        </Pressable>
                                        <Pressable hitSlop={10} style={styles.moreOverlayOption}
                                            onPress={() => Alert.alert("Implement Me")}>
                                            <View style={styles.moreOverlayOptionIcon}>
                                                <Flag wxh="20" color="#3e2723" />
                                            </View>
                                            <View style={styles.moreOverlayOptionTextContainer}>
                                                <Text style={styles.moreOverlayOptionText}>Report User</Text>
                                            </View>
                                        </Pressable>
                                        <Pressable hitSlop={10} style={styles.moreOverlayOption}
                                            onPress={() => Alert.alert("Implement Me")}>
                                            <View style={styles.moreOverlayOptionIcon}>
                                                <Flag wxh="20" color="#3e2723" />
                                            </View>
                                            <View style={styles.moreOverlayOptionTextContainer}>
                                                <Text style={styles.moreOverlayOptionText}>Report Post</Text>
                                            </View>
                                        </Pressable>
                                    </>
                                }
                            </View>
                        </View>
                    </View>
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.textLine}>{item.text}</Text>
                    {item.children.map((child) => (
                        <View key={child.uuid} style={styles.textSubLine}>
                            <Text style={styles.bullet}>{'\u2022'}</Text>
                            <Text style={styles.textLine}>{child.text}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.bottomActions}>
                    <Pressable style={styles.actionContainer}
                        onPress={handleReact}>
                        <ThumbUp wxh="20" color="#556B2F" />
                        <Text style={styles.actionLabel}>Like</Text>
                    </Pressable>
                </View>
            </View>
        )
    });

    const closeAllMoreMenus = () => {
        //console.log(`closeAllMoreMenus: ${JSON.stringify(communityItemRefs.current)}`);
        for (const uuid in communityItemRefs.current) {
            if (communityItemRefs.current.hasOwnProperty(uuid)) {
                communityItemRefs.current[uuid].hideMoreMenu();
            }
        }
    };

    return (
        <Pressable style={styles.container} onPress={closeAllMoreMenus}>
            <Animated.View style={[styles.animatedContainer, animatedOpacity]}>
                {(!communityItems) ?
                    <View style={styles.loadingAnimContainer}>
                        <ActivityIndicator size={"large"} color="#3E3723" />
                    </View>
                    : (communityItems.length > 0) ?
                        <FlatList data={communityItems}
                            renderItem={({ item, index, separators }) =>
                                <RenderItem ref={(ref) => {
                                    if (ref) {
                                        communityItemRefs.current[item.uuid] = ref;
                                    } else {
                                        delete communityItemRefs.current[item.uuid];
                                    }
                                }}
                                    key={item.uuid} item={item} index={index} separators={separators} />
                            }
                            keyExtractor={item => item.uuid}
                            refreshControl={
                                <RefreshControl
                                    tintColor="#3E3723"
                                    onRefresh={() => {
                                        setRefreshing(true);
                                        refreshList();
                                    }}
                                    refreshing={refreshing} />
                            }
                            onEndReached={({ distanceFromEnd }) => {
                                if (distanceFromEnd > 0) {
                                    loadNextPage();
                                }
                            }}
                            onEndReachedThreshold={0.1}
                            ListFooterComponent={
                                <View style={{ paddingTop: 10 }}>
                                    <Animated.View style={nextPageAnimatedOpacity}>
                                        <ActivityIndicator size={"small"} color="#3E3723" />
                                    </Animated.View>
                                </View>}
                        />
                        : <View style={styles.emptyListContainer}>
                            <Text style={styles.emptyListText}>Be the first to share your goals with the community!</Text>
                        </View>
                }
            </Animated.View>
        </Pressable>
    )
}

export default CommunityScreen;