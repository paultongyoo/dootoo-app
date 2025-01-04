import { AppContext } from "@/components/AppContext";
import { generateReactionCountObject, timeAgo } from "@/components/Helpers";
import { blockItem, blockUser, loadCommunityItems, reactToItem, updateItemPublicState } from "@/components/Storage";
import { CircleUserRound } from "@/components/svg/circle-user-round";
import { EllipsisVertical } from "@/components/svg/ellipsis-vertical";
import { EyeOff } from "@/components/svg/eye-off";
import { Flag } from "@/components/svg/flag";
import { ThumbUp } from "@/components/svg/thumb-up";
import { useFocusEffect, usePathname } from "expo-router";
import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View, ActivityIndicator, FlatList, Text, Alert, Pressable, RefreshControl } from "react-native";
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

const CommunityScreen = () => {
    const pathname = usePathname();
    const { username, anonymousId, setOpenItems, setDoneItems, communityItems, setCommunityItems } = useContext(AppContext);
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

    const modalUsername = useRef(null);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const showProfileModalOnReactionsModalHide = useRef(false);

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
            zIndex: 1
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
        }
    })

    const RenderItem = ({ item, index, separators }) => {

        const [reactionModalVisible, setReactionModalVisible] = useState(false);

        const handleMoreTap = (item) => {
            modalItem.current = item;
            setItemMoreModalVisible(true);
        }

        const handleReact = async (item, reaction_str = Constants.REACTION_LIKE) => {
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
            modalUsername.current = username;
            setProfileModalVisible(true);
        }

        return (
            <View style={styles.itemContainer}>
                <View style={styles.header}>
                    <View style={styles.profile}>
                        <View style={styles.profileIcon}>
                            <CircleUserRound wxh="32" color="#556B2F" />
                        </View>
                        <Pressable  onPress={() => handleUsernameTap(item.user.name)}
                                    style={styles.profileNameContainer}>
                            <Text style={styles.profileNameText}>
                                {item.user.name}
                            </Text>
                        </Pressable>
                    </View>
                    <View style={styles.rightCorner}>
                        <View style={styles.timeAgoContainer}>
                            <Text style={styles.timeAgo}>
                                {timeAgo(item.updatedAt)}
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
                    <Text style={[styles.textLine, item.is_done && styles.taskTitle_isDone]}>{item.text}</Text>
                    {item.children.map((child) => (
                        <View key={child.uuid} style={styles.textSubLine}>
                            <Text style={styles.bullet}>{'\u2022'}</Text>
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
            pathname: pathname
        });
        setItemMoreModalVisible(false);
        setHideFromCommunityDialogVisible(true);
    }

    const handleHideFromCommunityCancel = () => {
        amplitude.track("Item Hide from Public Prompt Cancelled", {
            anonymous_id: anonymousId,
            pathname: pathname
        });
        setHideFromCommunityDialogVisible(false);
    }

    const handleHideFromCommunitySubmit = () => {
        amplitude.track("Item Hide from Public Prompt Approved", {
            anonymous_id: anonymousId,
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

            amplitude.track("Block Profile Blocked", {
                anonymous_id: anonymousId,
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
                pathname: pathname,
                uuid: item_uuid
            });
        }
    }

    const handleHideUser = () => {
        amplitude.track("Hide User Prompt Displayed", {
            anonymous_id: anonymousId,
            pathname: pathname
        });
        setItemMoreModalVisible(false);
        setHideUserDialogVisible(true);
    }

    const handleHideUserCancel = () => {
        amplitude.track("Hide User Prompt Cancelled", {
            anonymous_id: anonymousId,
            pathname: pathname
        });
        setHideUserDialogVisible(false);
    }

    const handleHideUserSubmit = async () => {
        amplitude.track("Hide User Prompt Approved", {
            anonymous_id: anonymousId,
            pathname: pathname
        });
        await submitBlock(modalItem.current.user.name, "hide_user");
        setHideUserDialogVisible(false);
    }

    const handleReportUser = () => {
        setItemMoreModalVisible(false);
        setReportUserModalVisible(true);
    }

    const handleReportUserCancel = () => {
        setReportUserModalVisible(false);
    }

    const handleReportUserSubmit = async () => {
        if (selectedBlockReason == 'other') {
            await submitBlock(modalItem.current.user.name, `${selectedBlockReason}: ${blockReasonOtherText}`);
        } else {
            await submitBlock(modalItem.current.user.name, selectedBlockReason);
        }
        setReportUserModalVisible(false);
    }

    const handleReportPost = () => {
        setItemMoreModalVisible(false);
        setReportPostModalVisible(true);
    }

    const handleReportPostCancel = () => {
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

    const ItemMoreModal = () => (
        <Modal
            isVisible={itemMoreModalVisible}
            onBackdropPress={() => { setItemMoreModalVisible(false) }}
            backdropOpacity={0.3}
            animationIn="fadeIn">
            {(modalItem.current) ?
                <View style={styles.communityModal}>
                    {(username == modalItem.current.user.name)
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
                        : <>
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
                            </Pressable>
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
                        </>}
                </View>
                :
                <Text>No modal item selected!</Text>}
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
            <ProfileModal username={modalUsername.current} modalVisible={profileModalVisible} modalVisibleSetter={setProfileModalVisible} />
            <Dialog.Container visible={hideFromCommunityDialogVisible} onBackdropPress={handleHideFromCommunityCancel}>
                <Dialog.Title>Hide Item from the Community?</Dialog.Title>
                <Dialog.Description>The item will no longer display in the Community Feed.</Dialog.Description>
                <Dialog.Button label="Cancel" onPress={handleHideFromCommunityCancel} />
                <Dialog.Button label="Yes" onPress={handleHideFromCommunitySubmit} />
            </Dialog.Container>
            <Dialog.Container visible={hideUserDialogVisible} onBackdropPress={handleHideUserCancel}>
                <Dialog.Title>Hide All Posts by {(modalItem.current) ? modalItem.current.user.name : 'Not Initialized Yet'}?</Dialog.Title>
                <Dialog.Description>This currently cannot be undone.</Dialog.Description>
                <Dialog.Button label="Cancel" onPress={handleHideUserCancel} />
                <Dialog.Button label="Yes" onPress={handleHideUserSubmit} />
            </Dialog.Container>
            <Dialog.Container visible={reportUserDialogVisible} onBackdropPress={handleReportUserCancel}>
                <Dialog.Title>Report User</Dialog.Title>
                <Dialog.Description>This hides the user as well and currently cannot be undone.</Dialog.Description>
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