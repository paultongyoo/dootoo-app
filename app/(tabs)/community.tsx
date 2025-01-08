import { AppContext } from "@/components/AppContext";
import { generateReactionCountObject, isThingOverdue, pluralize, timeAgo } from "@/components/Helpers";
import { blockItem, blockUser, loadCommunityItems, loadItemsReactions, reactToItem, updateItemPublicState } from "@/components/Storage";
import { CircleUserRound } from "@/components/svg/circle-user-round";
import { EllipsisVertical } from "@/components/svg/ellipsis-vertical";
import { EyeOff } from "@/components/svg/eye-off";
import { Flag } from "@/components/svg/flag";
import { ThumbUp } from "@/components/svg/thumb-up";
import { useFocusEffect, usePathname } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, View, ActivityIndicator, FlatList, Text, Alert, Pressable, RefreshControl, Platform } from "react-native";
import Modal from "react-native-modal";
import * as amplitude from '@amplitude/analytics-react-native';
import * as Constants from '@/components/Constants';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Dialog from "react-native-dialog";
import RNPickerSelect from 'react-native-picker-select';
import { Heart } from "@/components/svg/heart";
import { Laugh } from "@/components/svg/laugh";
import { HandHeart } from "@/components/svg/hand-heart";
import { PartyPopper } from "@/components/svg/party-popper";
import ReactionsModal from "@/components/ReactionsModal";
import { ReactionsDisplay } from "@/components/ReactionsDisplay";
import ProfileModal from "@/components/ProfileModal";
import Toast from "react-native-toast-message";
import { Clock } from "@/components/svg/clock";

const CommunityScreen = () => {
    const pathname = usePathname();
    const { username, anonymousId, setOpenItems, setDoneItems,
        communityItems, setCommunityItems, hasMoreCommunityItems, communityLayoutOpacity } = useContext(AppContext);
    const [itemMoreModalVisible, setItemMoreModalVisible] = useState(false);
    const [hideFromCommunityDialogVisible, setHideFromCommunityDialogVisible] = useState(false);
    const [hideUserDialogVisible, setHideUserDialogVisible] = useState(false);
    const [reportUserDialogVisible, setReportUserModalVisible] = useState(false);
    const [reportPostModalVisible, setReportPostModalVisible] = useState(false);
    const [selectedBlockReason, setSelectedBlockReason] = useState('no_reason');
    const [blockReasonOtherText, setBlockReasonOtherText] = useState('');
    const [reactorsModalVisible, setReactorsModalVisible] = useState(false);
    const modalItem = useRef(null);
    const modelItemReactionCounts = useRef({});
    const modalItemReactions = useRef([]);

  
    const animatedOpacity = useAnimatedStyle(() => {
        return { opacity: communityLayoutOpacity.value }
    })
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const nextPageLoadingOpacity = useSharedValue(0);
    const nextPageAnimatedOpacity = useAnimatedStyle(() => {
        return { opacity: nextPageLoadingOpacity.value }
    })

    const modalUsername = useRef(null);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const showProfileModalOnReactionsModalHide = useRef(false);
    const showMoreModalOnProfileModalHide = useRef(false);

    useFocusEffect(
        useCallback(() => {
            //console.log("Community.useFocusEffect([]), communityItems: " + JSON.stringify(communityItems));
            
            // Component should be in one of two states on focus:
            // 1) Non-null community items = List completed initializing on launch in background
            // 2) Null communty items = List has not completed initializing on launch, still in progress
            // In both scenarios we want to fade in the layout into view:
            // 1) For scenario #1, the layout should render the loaded community items
            // 2) For scenario #2, the layout should render a loading animation
            const fadeInLayout = async () => {
                await new Promise<void>((resolve) =>
                    communityLayoutOpacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                        if (isFinished) {
                            runOnJS(resolve)();
                        }
                    }));
            }
            if (communityLayoutOpacity.value == 0) {
                fadeInLayout();
            }

            refreshCommunityReactions();
        }, [])
    )

    const refreshCommunityReactions = async () => {
        if (communityItems && communityItems.length > 0) {
            console.log("Refreshing community screen reactions...");
            const itemUUIDs = communityItems.map(item => item.uuid);
            const itemReactionsMap = await loadItemsReactions(itemUUIDs);
            if (itemReactionsMap) {
                //console.log("Item Reactions Map Response: " + JSON.stringify(itemReactionsMap));
                setCommunityItems(prevItems => {
                    let arrayToUpdate = [...prevItems];
                    let itemsRefreshed = 0
                    for (const uuid in itemReactionsMap) {
                        if (itemReactionsMap.hasOwnProperty(uuid)) {
                            const returnedReactions = itemReactionsMap[uuid];
                            //console.log("Returned reaction: " + JSON.stringify(returnedReactions));
                            arrayToUpdate = arrayToUpdate.map(item =>
                                (item.uuid == uuid)
                                    ? { ...item, userReactions: returnedReactions }
                                    : item
                            )
                            itemsRefreshed += 1;
                        }
                    }
                    console.log(`${pluralize('item', itemsRefreshed)} refreshed.`)
                    return arrayToUpdate;
                });
            } else {
                console.log("Received null item reactions map -- unexpected?");
            }
        } else {
            console.log("Community array empty, unexpected?");
        }
    }

    const initialItemsMount = useRef(true);
    useEffect(() => {
        //console.log("useEffect([communityItems]), length: " + ((communityItems) ? communityItems.length : '<undefined>'));

        if (initialItemsMount.current) {
            initialItemsMount.current = false;
        } else if (communityLayoutOpacity.value == 0) {
            const fadeInLayout = async () => {
                await new Promise<void>((resolve) =>
                    communityLayoutOpacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                        if (isFinished) {
                            runOnJS(resolve)();
                        }
                    }));
            }
            fadeInLayout();
        }
    }, [communityItems]);

    const initialPageMount = useRef(true);
    useEffect(() => {
        if (initialPageMount.current) {
            initialPageMount.current = false;
        } else {
            const updateCommunityPage = async (requestedPage) => {
                const responseObj = await loadCommunityItems(requestedPage);
                hasMoreCommunityItems.current = responseObj.hasMore;

                if (requestedPage == 1) {

                    if (responseObj.items.length == 0) {
                        await new Promise<void>((resolve) =>
                            communityLayoutOpacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                                if (isFinished) {
                                    runOnJS(resolve)();
                                }
                            }));
                    }

                    // 1.7 Null check needed to prevent null error when resaving files in dev
                    //     -- Hack or required?
                    if (responseObj.items) {
                        setCommunityItems([...responseObj.items])
                    }
                } else {

                    await new Promise<void>((resolve) => {
                        nextPageLoadingOpacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                            if (isFinished) {
                                runOnJS(resolve)();
                            }
                        })
                    })

                    // 1.7 Null check needed to prevent null error when resaving files in dev
                    //     -- Hack or required?
                    if (responseObj.items) {
                        setCommunityItems(prevItems => [
                            ...prevItems,
                            ...responseObj.items
                        ]);
                    }
                }
                setRefreshing(false);
            }
            amplitude.track("Community Page Loaded", {
                anonymous_id: anonymousId,
                username: username,
                pathname: pathname,
                page: page
            });
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
        if (hasMoreCommunityItems.current) {
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
            alignItems: 'center',
            position: 'relative',
            zIndex: 99
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
            paddingHorizontal: 10
        },
        rightCorner: {
            flexDirection: 'row'
        },
        timeAgoContainer: {
            paddingRight: 4
        },
        timeAgoDesc: {
            fontSize: 12,
            color: '#808080',
            textAlign: 'right'
        },
        timeAgo: {
            fontSize: 12,
            color: '#808080',
            textAlign: 'right'
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
            zIndex: 1
        },
        textLine: {
            fontSize: 16
        },
        textSubLine: {
            flexDirection: 'row',
            position: 'relative',
            paddingLeft: 20,
            alignItems: 'center',
            marginTop: 5
        },
        bullet: {
            fontWeight: 'bold',
            color: "#556B2F",
            position: 'absolute',
            left: 7,
            top: 3
        },
        bottomActions: {
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: "#3E272333",
            marginTop: 10,
            marginHorizontal: 10,
            justifyContent: 'center',
            position: 'relative'
        },
        actionContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            padding: 5,
            margin: 5,
            width: '100%'
        },
        actionLabel: {
            fontWeight: 'bold',
            fontSize: 14,
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
        communityModal: {
            // position: 'absolute',
            // right: 10,
            backgroundColor: '#FAF3E0',
            borderRadius: 5,
            width: '100%',
            paddingHorizontal: 10,
            paddingVertical: 5
        },
        moreOverlayOption: {
            flexDirection: 'row',
            paddingHorizontal: 10,
            paddingVertical: 15,
            justifyContent: 'center',
            alignItems: 'center'
        },
        moreOverlayOptionIcon: {

        },
        moreOverlayOptionTextContainer: {

        },
        moreOverlayOptionText: {
            paddingLeft: 10,
            fontSize: 16,
            fontWeight: 'bold',
            color: '#3e2723'
        },
        modalTitleContainer: {

        },
        modalTitleText: {

        },
        blockedReasonTextInput: {
            height: 50,
            padding: 10,
            width: 200
        },
        taskTitle_isDone: {
            color: '#556B2F',
            textDecorationLine: 'line-through'
        },
        reactionsDisplay: {
            paddingLeft: 10
        },
        reactionsModal: {
            backgroundColor: '#FAF3E0',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 10
        },
        modalReactions: {
            flexDirection: 'row'
        },
        modalReaction: {
            padding: 10
        },
        reactionModalCopy: {
            marginVertical: 10
        },
        reactionModalCopyText: {
            color: '#3e2723',
            fontWeight: 'bold'
        },
        timerIconContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingRight: 8
        },
        mainLineTextContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row'
        }
    })

    const RenderItem = ({ item, index, separators }) => {

        const [reactionModalVisible, setReactionModalVisible] = useState(false);

        const handleMoreTap = (item) => {
            amplitude.track(`User Tapped Post More Icon`, {
                anonymous_id: anonymousId,
                username: username,
                uuid: item.uuid
            });

            modalItem.current = item;
            setItemMoreModalVisible(true);
        }

        const handleReact = async (item, reaction_str = Constants.REACTION_LIKE) => {
            amplitude.track(`User Reacted to Post`, {
                anonymous_id: anonymousId,
                username: username,
                uuid: item.uuid,
                reaction: reaction_str
            });

            const hasReaction = item.userReactions.some(reaction => (reaction.user.name == username) && (reaction.reaction.name == reaction_str));
            if (!hasReaction) {
                reactToItem(item.uuid, reaction_str);
                setCommunityItems(prevItems => prevItems.map(prevItem =>
                    (prevItem.uuid == item.uuid)
                        ? { ...prevItem, userReactions: [{ reaction: { name: reaction_str }, user: { name: username } }, ...prevItem.userReactions.filter(reaction => reaction.user.name != username)] }
                        : prevItem));
                if (item.is_done) {
                    setDoneItems(prevItems => prevItems.map(prevItem =>
                        (prevItem.uuid == item.uuid)
                            ? { ...prevItem, userReactions: [{ reaction: { name: reaction_str }, user: { name: username } }, ...prevItem.userReactions.filter(reaction => reaction.user.name != username)] }
                            : prevItem));
                } else {
                    setOpenItems(prevItems => prevItems.map(prevItem =>
                        (prevItem.uuid == item.uuid)
                            ? { ...prevItem, userReactions: [{ reaction: { name: reaction_str }, user: { name: username } }, ...prevItem.userReactions.filter(reaction => reaction.user.name != username)] }
                            : prevItem));
                }
            } else {
                reactToItem(item.uuid, reaction_str, true);
                setCommunityItems(prevItems => prevItems.map(prevItem =>
                    (prevItem.uuid == item.uuid)
                        ? { ...prevItem, userReactions: prevItem.userReactions.filter(reaction => !((reaction.user.name == username) && (reaction.reaction.name == reaction_str))) }
                        : prevItem));
                if (item.is_done) {
                    setDoneItems(prevItems => prevItems.map(prevItem =>
                        (prevItem.uuid == item.uuid)
                            ? { ...prevItem, userReactions: prevItem.userReactions.filter(reaction => !((reaction.user.name == username) && (reaction.reaction.name == reaction_str))) }
                            : prevItem));
                } else {
                    setOpenItems(prevItems => prevItems.map(prevItem =>
                        (prevItem.uuid == item.uuid)
                            ? { ...prevItem, userReactions: prevItem.userReactions.filter(reaction => !((reaction.user.name == username) && (reaction.reaction.name == reaction_str))) }
                            : prevItem));
                }
            }
        }

        const handleLongReact = (item) => {
            setReactionModalVisible(true);
        }

        const handleUsernameTap = (username) => {
            amplitude.track(`Username Tapped `, {
                anonymous_id: anonymousId,
                username: username,
                uuid: item.uuid
            });

            modalUsername.current = username;
            setProfileModalVisible(true);
        }

        const handleTimerClick = (thing) => {
            amplitude.track("Item Timer Icon Tapped", {
                anonymous_id: anonymousId,
                username: username,
                pathname: pathname,
                uuid: thing.uuid
            });
            Toast.show({
                type: 'timerInfo',
                visibilityTime: 8000,
                position: 'bottom',
                bottomOffset: (Platform.OS == 'ios') ? 280 : 260,
                props: {
                    thing: thing
                }
            });
        }

        return (
            <View style={styles.itemContainer}>
                <View style={styles.header}>
                    <View style={styles.profile}>
                        <View style={styles.profileIcon}>
                            <CircleUserRound wxh="32" color="#556B2F" />
                        </View>
                        <Pressable onPress={() => handleUsernameTap(item.user.name)}
                            style={({ pressed }) => [styles.profileNameContainer, pressed && { backgroundColor: '#3e272310' }]}>
                            <Text style={styles.profileNameText}>
                                {item.user.name}
                            </Text>
                        </Pressable>
                    </View>
                    <View style={styles.rightCorner}>
                        <View style={styles.timeAgoContainer}>
                            <Text style={styles.timeAgoDesc}>
                                {item.public_update_desc}
                            </Text>
                            <Text style={styles.timeAgo}>
                                {item.public_updatedAt && (timeAgo(item.public_updatedAt))}
                            </Text>
                        </View>
                        <View style={styles.moreIconContainer}>
                            <Pressable hitSlop={10} onPress={() => handleMoreTap(item)}>
                                <EllipsisVertical wxh="20" color="#556B2F" />
                            </Pressable>
                        </View>
                    </View>
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.mainLineTextContainer}>
                        {item.scheduled_datetime_utc && (
                            <View style={styles.timerIconContainer}>
                                <Pressable hitSlop={10} style={({ pressed }) => pressed && { backgroundColor: '#3e272310' }}
                                    onPress={() => handleTimerClick(item)}>
                                    {(isThingOverdue(item) && !item.is_done)
                                        ? <Clock wxh="20" color="#FF0000" />
                                        : <Clock wxh="20" color="#556B2F" />
                                    }
                                </Pressable>
                            </View>
                        )}
                        <Text style={[styles.textLine, item.is_done && styles.taskTitle_isDone]}>{item.text}</Text>
                    </View>
                    {item.children.map((child) => (
                        <View key={child.uuid} style={styles.textSubLine}>
                            <Text style={styles.bullet}>{'\u2022'}</Text>
                            {child.scheduled_datetime_utc && (
                                <View style={styles.timerIconContainer}>
                                    <Pressable hitSlop={10} style={({ pressed }) => pressed && { backgroundColor: '#3e272310' }}
                                        onPress={() => handleTimerClick(child)}>
                                        {(isThingOverdue(child) && !child.is_done)
                                            ? <Clock wxh="15" color="#FF0000" />
                                            : <Clock wxh="15" color="#556B2F" />
                                        }
                                    </Pressable>
                                </View>
                            )}
                            <Text style={[styles.textLine, child.is_done && styles.taskTitle_isDone]}>{child.text}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.reactionsDisplay}>
                    <ReactionsDisplay reactions={item.userReactions} onReactionsPress={() => handleReactionsTap(item)} />
                </View>
                <View style={styles.bottomActions}>

                    {(item.userReactions.length == 0) || !(item.userReactions.some(reaction => reaction.user.name == username))
                        ? <Pressable style={({ pressed }) => [styles.actionContainer, pressed && { backgroundColor: '#3e372310' }]}
                            onLongPress={() => handleLongReact(item)} delayLongPress={300}
                            onPress={() => handleReact(item, Constants.REACTION_LIKE)}>
                            <ThumbUp wxh="20" color="#3E272399" />
                            <Text style={[styles.actionLabel, { color: '#3E272399' }]}>Like</Text>
                        </Pressable>
                        : <>
                            {(item.userReactions.filter(reaction => reaction.user.name == username).map(reaction => (
                                (reaction.reaction.name == Constants.REACTION_LIKE)
                                    ? <Pressable key={reaction.reaction.name} style={({ pressed }) => [styles.actionContainer, pressed && { backgroundColor: '#3e372310' }]}
                                        onLongPress={() => handleLongReact(item)} delayLongPress={300}
                                        onPress={() => handleReact(item, Constants.REACTION_LIKE)}>
                                        <ThumbUp wxh="20" color="#556B2F" fill="#556B2F60" />
                                        <Text style={[styles.actionLabel, { color: '#556B2F' }]}>Like</Text>
                                    </Pressable>
                                    : (reaction.reaction.name == Constants.REACTION_LOVE)
                                        ? <Pressable key={reaction.reaction.name} style={({ pressed }) => [styles.actionContainer, pressed && { backgroundColor: '#3e372310' }]}
                                            onLongPress={() => handleLongReact(item)} delayLongPress={300}
                                            onPress={() => handleReact(item, Constants.REACTION_LOVE)}>
                                            <Heart wxh="20" color="#556B2F" fill="#556B2F60" />
                                            <Text style={[styles.actionLabel, { color: '#556B2F' }]}>Love</Text>
                                        </Pressable>
                                        : (reaction.reaction.name == Constants.REACTION_LAUGH)
                                            ? <Pressable key={reaction.reaction.name} style={({ pressed }) => [styles.actionContainer, pressed && { backgroundColor: '#3e372310' }]}
                                                onLongPress={() => handleLongReact(item)} delayLongPress={300}
                                                onPress={() => handleReact(item, Constants.REACTION_LAUGH)}>
                                                <Laugh wxh="20" color="#556B2F" fill="#556B2F60" />
                                                <Text style={[styles.actionLabel, { color: '#556B2F' }]}>Laugh</Text>
                                            </Pressable>
                                            : (reaction.reaction.name == Constants.REACTION_SUPPORT)
                                                ? <Pressable key={reaction.reaction.name} style={({ pressed }) => [styles.actionContainer, pressed && { backgroundColor: '#3e372310' }]}
                                                    onLongPress={() => handleLongReact(item)} delayLongPress={300}
                                                    onPress={() => handleReact(item, Constants.REACTION_SUPPORT)}>
                                                    <HandHeart wxh="20" color="#556B2F" fill="#556B2F60" />
                                                    <Text style={[styles.actionLabel, { color: '#556B2F' }]}>Support</Text>
                                                </Pressable>
                                                : <Pressable key={reaction.reaction.name} style={({ pressed }) => [styles.actionContainer, pressed && { backgroundColor: '#3e372310' }]}
                                                    onLongPress={() => handleLongReact(item)} delayLongPress={300}
                                                    onPress={() => handleReact(item, Constants.REACTION_CELEBRATE)}>
                                                    <PartyPopper wxh="20" color="#556B2F" fill="#556B2F60" />
                                                    <Text style={[styles.actionLabel, { color: '#556B2F' }]}>Celebrate</Text>
                                                </Pressable>
                            )))}
                        </>
                    }
                    <Modal
                        backdropOpacity={0.3}
                        isVisible={reactionModalVisible}
                        onBackdropPress={() => { setReactionModalVisible(false) }}>
                        <View style={styles.reactionsModal}>
                            <View style={styles.modalReactions}>
                                <Pressable style={({ pressed }) => [styles.modalReaction, pressed && { backgroundColor: '#3e372310' }]} onPress={() => handleReact(item, Constants.REACTION_LIKE)}>
                                    <ThumbUp wxh="30" color="#556B2F" />
                                </Pressable>
                                <Pressable style={({ pressed }) => [styles.modalReaction, pressed && { backgroundColor: '#3e372310' }]} onPress={() => handleReact(item, Constants.REACTION_LOVE)}>
                                    <Heart wxh="30" color="#556B2F" />
                                </Pressable>
                                <Pressable style={({ pressed }) => [styles.modalReaction, pressed && { backgroundColor: '#3e372310' }]} onPress={() => handleReact(item, Constants.REACTION_LAUGH)}>
                                    <Laugh wxh="30" color="#556B2F" />
                                </Pressable>
                                <Pressable style={({ pressed }) => [styles.modalReaction, pressed && { backgroundColor: '#3e372310' }]} onPress={() => handleReact(item, Constants.REACTION_SUPPORT)}>
                                    <HandHeart wxh="30" color="#556B2F" />
                                </Pressable>
                                <Pressable style={({ pressed }) => [styles.modalReaction, pressed && { backgroundColor: '#3e372310' }]} onPress={() => handleReact(item, Constants.REACTION_CELEBRATE)}>
                                    <PartyPopper wxh="30" color="#556B2F" />
                                </Pressable>
                            </View>
                            <View style={styles.reactionModalCopy}>
                                <Text style={styles.reactionModalCopyText}>Tap to select a reaction</Text>
                            </View>
                        </View>

                    </Modal>
                </View>
            </View >
        )
    };

    const handleReactionsTap = (item) => {
        amplitude.track("Post Reactions Tapped", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        modalItem.current = item;
        modelItemReactionCounts.current = generateReactionCountObject(item.userReactions);
        modalItemReactions.current = item.userReactions;
        // console.log("modelItemCounts: " + JSON.stringify(modalItemCounts.current));
        // console.log("modalItemReactions: " + JSON.stringify(modalItemReactions.current));
        setReactorsModalVisible(true);
    }

    const handleHideFromCommunity = () => {
        amplitude.track("Item Hide from Public Prompt Displayed", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        setItemMoreModalVisible(false);
        setHideFromCommunityDialogVisible(true);
    }

    const handleHideFromCommunityCancel = () => {
        amplitude.track("Item Hide from Public Prompt Cancelled", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        setHideFromCommunityDialogVisible(false);
    }

    const handleHideFromCommunitySubmit = () => {
        amplitude.track("Item Hide from Public Prompt Approved", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        setHideFromCommunityDialogVisible(false);
        setCommunityItems(prevItems =>
            prevItems.filter(prevItem => prevItem.uuid != modalItem.current.uuid));
        if (modalItem.current.is_done) {
            setDoneItems(prevItems => prevItems.map((prevItem) =>
                (prevItem.uuid == modalItem.current.uuid)
                    ? { ...prevItem, is_public: false }
                    : prevItem));
        } else {
            setOpenItems(prevItems => prevItems.map((prevItem) =>
                (prevItem.uuid == modalItem.current.uuid)
                    ? { ...prevItem, is_public: false }
                    : prevItem));
        }
        updateItemPublicState(modalItem.current.uuid, false);
    }

    const submitBlock = async (username, block_reason_str) => {
        const wasBlockSuccessful = await blockUser(username, block_reason_str);
        if (wasBlockSuccessful) {

            amplitude.track("Profile Blocked", {
                anonymous_id: anonymousId,
                username: username,
                pathname: pathname,
                name: username
            });

            setItemMoreModalVisible(false);
            setCommunityItems(prevItems =>
                prevItems.filter(prevItem => prevItem.user.name != username));

        } else {
            Alert.alert(
                "Unexpected error occurred",
                "An unexpected error occurred when attempting to block the user.  We will fix this issue as soon as possible.");
            amplitude.track("Block Profile Unexpected Error", {
                anonymous_id: anonymousId,
                username: username,
                pathname: pathname,
                name: username
            });
        }
    }

    const submitItemBlock = async (item_uuid, block_reason_str) => {
        const wasBlockSuccessful = await blockItem(item_uuid, block_reason_str);
        if (wasBlockSuccessful) {

            amplitude.track("Item Blocked", {
                anonymous_id: anonymousId,
                username: username,
                pathname: pathname,
                uuid: item_uuid
            });

            setReportPostModalVisible(false);
            setCommunityItems(prevItems =>
                prevItems.filter(prevItem => prevItem.uuid != item_uuid));

        } else {
            Alert.alert(
                "Unexpected error occurred",
                "An unexpected error occurred when attempting to block the post.  We will fix this issue as soon as possible.");
            amplitude.track("Block Item Unexpected Error", {
                anonymous_id: anonymousId,
                username: username,
                pathname: pathname,
                uuid: item_uuid
            });
        }
    }

    const handleHideUser = () => {
        amplitude.track("Hide User Prompt Displayed", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        setItemMoreModalVisible(false);
        setHideUserDialogVisible(true);
    }

    const handleHideUserCancel = () => {
        amplitude.track("Hide User Prompt Cancelled", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        setHideUserDialogVisible(false);
    }

    const handleHideUserSubmit = async () => {
        amplitude.track("Hide User Prompt Submitted", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        await submitBlock((modalItem.current) ? modalItem.current.user.name : modalUsername.current, "hide_user");
        setHideUserDialogVisible(false);
    }

    const handleReportUser = () => {
        amplitude.track("Report User Prompt Displayed", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        setItemMoreModalVisible(false);
        setReportUserModalVisible(true);
    }

    const handleReportUserCancel = () => {
        amplitude.track("Report User Prompt Cancelled", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        setReportUserModalVisible(false);
    }

    const handleReportUserSubmit = async () => {
        if (selectedBlockReason == 'other') {
            await submitBlock((modalItem.current) ? modalItem.current.user.name : modalUsername.current, `${selectedBlockReason}: ${blockReasonOtherText}`);
        } else {
            await submitBlock((modalItem.current) ? modalItem.current.user.name : modalUsername.current, selectedBlockReason);
        }
        setReportUserModalVisible(false);
    }

    const handleReportPost = () => {
        amplitude.track("Report Post Prompt Displayed", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        setItemMoreModalVisible(false);
        setReportPostModalVisible(true);
    }

    const handleReportPostCancel = () => {
        amplitude.track("Report Post Prompt Cancelled", {
            anonymous_id: anonymousId,
            username: username,
            pathname: pathname
        });
        setReportPostModalVisible(false);
    }

    const handleReportPostSubmit = async () => {
        if (selectedBlockReason == 'other') {
            await submitItemBlock(modalItem.current.uuid, `${selectedBlockReason}: ${blockReasonOtherText}`);
        } else {
            await submitItemBlock(modalItem.current.uuid, selectedBlockReason);
        }
        setReportPostModalVisible(false);
    }

    // Using this modal for two use cases:
    // 1) More Icon click on Post (modalItem.current is NOT null)
    // 2) More Icon click on Profile modal (modalItem.current IS null)
    const ItemMoreModal = () => (
        <Modal
            isVisible={itemMoreModalVisible}
            onBackdropPress={() => { setItemMoreModalVisible(false) }}
            backdropOpacity={0.3}
            animationIn="fadeIn"
            animationOut="fadeOut">
            <View style={styles.communityModal}>
                {(modalItem.current) && (username == modalItem.current.user.name)
                    ? <Pressable hitSlop={10}
                        style={({ pressed }) => [
                            styles.moreOverlayOption,
                            pressed && { backgroundColor: '#3e372310' }
                        ]}
                        onPress={handleHideFromCommunity}>
                        <View style={styles.moreOverlayOptionIcon}>
                            <EyeOff wxh="20" color="#3e2723" />
                        </View>
                        <View style={styles.moreOverlayOptionTextContainer}>
                            <Text style={styles.moreOverlayOptionText}>Hide from Community</Text>
                        </View>
                    </Pressable>
                    : <></>}
                {((modalItem.current) && (username != modalItem.current.user.name)) ||
                    ((!modalItem.current) && (username != modalUsername.current)) ? <>
                    <Pressable hitSlop={10}
                        style={({ pressed }) => [
                            styles.moreOverlayOption,
                            pressed && { backgroundColor: '#3e372310' }
                        ]}
                        onPress={handleHideUser}>
                        <View style={styles.moreOverlayOptionIcon}>
                            <EyeOff wxh="20" color="#3e2723" />
                        </View>
                        <View style={styles.moreOverlayOptionTextContainer}>
                            <Text style={styles.moreOverlayOptionText}>Hide User</Text>
                        </View>
                    </Pressable>
                    <Pressable hitSlop={10}
                        style={({ pressed }) => [
                            styles.moreOverlayOption,
                            pressed && { backgroundColor: '#3e372310' }
                        ]}
                        onPress={handleReportUser}>
                        <View style={styles.moreOverlayOptionIcon}>
                            <Flag wxh="20" color="#3e2723" />
                        </View>
                        <View style={styles.moreOverlayOptionTextContainer}>
                            <Text style={styles.moreOverlayOptionText}>Report User</Text>
                        </View>
                    </Pressable></> : <></>}
                {(modalItem.current) && (username != modalItem.current.user.name) ?
                    <Pressable hitSlop={10}
                        style={({ pressed }) => [
                            styles.moreOverlayOption,
                            pressed && { backgroundColor: '#3e372310' }
                        ]}
                        onPress={handleReportPost}>
                        <View style={styles.moreOverlayOptionIcon}>
                            <Flag wxh="20" color="#3e2723" />
                        </View>
                        <View style={styles.moreOverlayOptionTextContainer}>
                            <Text style={styles.moreOverlayOptionText}>Report Post</Text>
                        </View>
                    </Pressable>
                    : <></>}
            </View>
        </Modal>
    )



    const pickerSelectStyles = StyleSheet.create({
        inputIOS: {
            fontSize: 14,
            paddingVertical: 12,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: 'gray',
            borderRadius: 4,
            color: 'black',
            textAlign: 'center',
            marginLeft: 20,
            marginRight: 20,
            marginBottom: 20,
            backgroundColor: 'white'
        },
        inputAndroid: {
            fontSize: 14,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderWidth: 0.5,
            borderColor: 'purple',
            borderRadius: 8,
            color: 'black',
            paddingRight: 30, // to ensure the text is never behind the icon
        }
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.animatedContainer, animatedOpacity]}>
                {(!communityItems) ?
                    <View style={styles.loadingAnimContainer}>
                        <ActivityIndicator size={"large"} color="#3E3723" />
                    </View>
                    : (communityItems.length > 0) ?
                        <FlatList data={communityItems}
                            renderItem={({ item, index, separators }) =>
                                <RenderItem item={item} index={index} separators={separators} />
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
            <ItemMoreModal />
            <ReactionsModal modalVisible={reactorsModalVisible} modalVisibleSetter={setReactorsModalVisible}
                reactions={modalItemReactions.current} reactionCounts={modelItemReactionCounts.current}
                onUsernamePress={(username) => {
                    showProfileModalOnReactionsModalHide.current = true;
                    modalUsername.current = username;
                    setReactorsModalVisible(false);
                }}
                onModalHide={() => {
                    if (showProfileModalOnReactionsModalHide.current) {
                        setProfileModalVisible(true);
                        showProfileModalOnReactionsModalHide.current = false;
                    }
                }} />
            <ProfileModal username={modalUsername.current} modalVisible={profileModalVisible} modalVisibleSetter={setProfileModalVisible}
                onMoreIconPress={(username) => {
                    showMoreModalOnProfileModalHide.current = true;
                    modalItem.current = null;
                    modalUsername.current = username;
                    setProfileModalVisible(false);
                }}
                onModalHide={() => {
                    if (showMoreModalOnProfileModalHide.current) {
                        setItemMoreModalVisible(true);
                        showMoreModalOnProfileModalHide.current = false;
                    }
                }}
            />
            <Dialog.Container visible={hideFromCommunityDialogVisible} onBackdropPress={handleHideFromCommunityCancel}>
                <Dialog.Title>Hide Item from the Community?</Dialog.Title>
                <Dialog.Description>The item will no longer display in the Community Feed.</Dialog.Description>
                <Dialog.Button label="Cancel" onPress={handleHideFromCommunityCancel} />
                <Dialog.Button label="Yes" onPress={handleHideFromCommunitySubmit} />
            </Dialog.Container>
            <Dialog.Container visible={hideUserDialogVisible} onBackdropPress={handleHideUserCancel}>
                <Dialog.Title>Hide All Posts by {(modalItem.current) ? modalItem.current.user.name : modalUsername.current}?</Dialog.Title>
                <Dialog.Description>This currently cannot be undone.</Dialog.Description>
                <Dialog.Button label="Cancel" onPress={handleHideUserCancel} />
                <Dialog.Button label="Yes" onPress={handleHideUserSubmit} />
            </Dialog.Container>
            <Dialog.Container visible={reportUserDialogVisible} onBackdropPress={handleReportUserCancel}>
                <Dialog.Title>Report {(modalItem.current) ? modalItem.current.user.name : modalUsername.current}?</Dialog.Title>
                <Dialog.Description>This will hide {(modalItem.current) ? modalItem.current.user.name : modalUsername.current}'s posts as well and currently cannot be undone.</Dialog.Description>
                <RNPickerSelect
                    onValueChange={(value) => setSelectedBlockReason(value)}
                    placeholder={{ label: 'Select a reason', value: 'no_reason' }}
                    style={pickerSelectStyles}
                    items={[
                        { label: 'Hate Speech', value: 'hate_speech' },
                        { label: 'Cyberbullying', value: 'cyberbulling' },
                        { label: 'Violent threats', value: 'violent_threats' },
                        { label: 'Promoting Services, Spam', value: 'sell_promote_spam' },
                        { label: 'Other', value: 'other' },
                    ]} />
                {(selectedBlockReason == 'other') ?
                    <Dialog.Input
                        multiline={true}
                        numberOfLines={2}
                        style={styles.blockedReasonTextInput}
                        placeholder={'Enter reason'}
                        onChangeText={(text) => {
                            setBlockReasonOtherText(text);
                        }} /> : <></>
                }
                <Dialog.Button label="Cancel" onPress={handleReportUserCancel} />
                <Dialog.Button label="Submit" onPress={handleReportUserSubmit} />
            </Dialog.Container>
            <Dialog.Container visible={reportPostModalVisible} onBackdropPress={handleReportPostCancel}>
                <Dialog.Title>Report Post</Dialog.Title>
                <Dialog.Description>This hides the post as well and currently cannot be undone.</Dialog.Description>
                <RNPickerSelect
                    onValueChange={(value) => setSelectedBlockReason(value)}
                    placeholder={{ label: 'Select a reason', value: 'no_reason' }}
                    style={pickerSelectStyles}
                    items={[
                        { label: 'Select a reason', value: 'no_reason' },
                        { label: 'Hate Speech', value: 'hate_speech' },
                        { label: 'Cyberbullying', value: 'cyberbulling' },
                        { label: 'Violent threats', value: 'violent_threats' },
                        { label: 'Promoting Services, Spam', value: 'sell_promote_spam' },
                        { label: 'Other', value: 'other' },
                    ]} />
                {(selectedBlockReason == 'other') ?
                    <Dialog.Input
                        multiline={true}
                        numberOfLines={2}
                        style={styles.blockedReasonTextInput}
                        placeholder={'Enter reason'}
                        onChangeText={(text) => {
                            setBlockReasonOtherText(text);
                        }} /> : <></>
                }
                <Dialog.Button label="Cancel" onPress={handleReportPostCancel} />
                <Dialog.Button label="Submit" onPress={handleReportPostSubmit} />
            </Dialog.Container>
        </View>
    )
}

export default CommunityScreen;