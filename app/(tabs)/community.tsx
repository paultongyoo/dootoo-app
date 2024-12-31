import { timeAgo } from "@/components/Helpers";
import { loadCommunityItems } from "@/components/Storage";
import { CircleUserRound } from "@/components/svg/circle-user-round";
import { EllipsisVertical } from "@/components/svg/ellipsis-vertical";
import { ThumbUp } from "@/components/svg/thumb-up";
import { UserCircle } from "@/components/svg/user-circle";
import { UserRound } from "@/components/svg/user-round";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ActivityIndicator, FlatList, Text, Alert, Pressable, RefreshControl } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const CommunityScreen = () => {

    const [screenInitialized, setScreenInitialized] = useState(false);
    const initialLoadFadeInOpacity = useSharedValue(0);
    const initialLoadAnimatedOpacity = useAnimatedStyle(() => {
        return { opacity: initialLoadFadeInOpacity.value }
    })
    const [communityItems, setCommunityItems] = useState(null);
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const hasMoreItems = useRef(false);
    const nextPageLoadingOpacity = useSharedValue(0);
    const nextPageAnimatedOpacity = useAnimatedStyle(() => {
        return { opacity: nextPageLoadingOpacity.value }
    })

    useEffect(() => {
        const initializeCommunityScreen = async () => {
            await new Promise<void>((resolve) =>
                initialLoadFadeInOpacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                    if (isFinished) {
                        runOnJS(resolve)();
                    }
                }));

            const responseObj = await loadCommunityItems(page);
            hasMoreItems.current = responseObj.hasMore;
            setCommunityItems([...responseObj.items])
        }
        initializeCommunityScreen();
    }, []);

    const initialPageMount = useRef(true);
    useEffect(() => {
        if (initialPageMount.current) {
            initialPageMount.current = false;
        } else {
            const updateCommunityPage = async (requestedPage) => {
                const responseObj = await loadCommunityItems(requestedPage);
                hasMoreItems.current = responseObj.hasMore;

                await new Promise<void>((resolve) => {
                    nextPageLoadingOpacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                        if (isFinished) {
                            runOnJS(resolve)();
                        }
                    })
                })

                if (requestedPage == 1) {
                    setCommunityItems([...responseObj.items])
                } else {
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
            console.log(`Ignoring onEndReached call as user doesn't have more items to return`);
        }
    }

    const styles = StyleSheet.create({
        container: {
            backgroundColor: '#DCC7AA',
            flex: 1
        },
        initialLoadAnimContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        },
        itemContainer: {
            backgroundColor: "#FAF3E099",
            padding: 10,
            margin: 10,
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
            paddingHorizontal: 5
        },
        textContainer: {
            marginVertical: 20,
            marginLeft: 10,
            marginRight: 100
        },
        textLine: {
            fontSize: 16
        },
        textSubLine: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 5
        },
        bullet: {
            fontWeight: 'bold',
            color: "#556B2F",
            marginHorizontal: 10
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
            flexDirection: 'row',
            padding: 10
        },
        actionLabel: {
            fontWeight: 'bold',
            fontSize: 14,
            color: '#556B2F',
            paddingHorizontal: 10
        }
    })

    const renderItem = ({ item, index, separators }) => {

        const handleMoreTap = () => {
            Alert.alert("Implement More Menu for item " + item.text);
        }

        const handleReact = () => {
            Alert.alert("Implement Reaction for item " + item.text);
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
                        </View>
                    </View>
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.textLine}>{item.text}</Text>
                    {item.children.map((child) => (
                        <View style={styles.textSubLine}>
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
    }

    return (
        <View style={styles.container}>
            {(!communityItems) ?
                <Animated.View style={[styles.initialLoadAnimContainer, initialLoadAnimatedOpacity]}>
                    <ActivityIndicator size={"large"} color="#3E3723" />
                </Animated.View>
                : <FlatList data={communityItems}
                    renderItem={renderItem}
                    keyExtractor={item => `${item.user.name}_${item.text}`}
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
            }
        </View>
    )
}

export default CommunityScreen;