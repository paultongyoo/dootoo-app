import {
  Image, Text, View, StyleSheet, Pressable, Alert,
  Platform
} from "react-native";
import { useState, useContext, useEffect } from 'react';
import { useNavigation, usePathname, useRouter } from 'expo-router';
import Reanimated, {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { AppContext } from '@/components/AppContext';
import { transcribeAudioToTips } from '@/components/BackendServices';
import { loadTips, saveTips, tipVote, flagTip, deleteTip, updateTipText, updateTipOrder, saveNewTip } from '@/components/Storage';
import DootooTipSidebar from "@/components/DootooTipSidebar";
import DootooTipEmptyUX from "@/components/DootooTipEmptyUX";
import DootooList, { listStyles } from "@/components/DootooList";
import DootooItemSidebar from "@/components/DootooItemSidebar";
import * as amplitude from '@amplitude/analytics-react-native';
import { LIST_ITEM_EVENT__UPDATE_COUNTS, ListItemEventEmitter, ProfileCountEventEmitter } from "@/components/EventEmitters";


export default function ItemTips() {
  const router = useRouter();
  const { anonymousId, selectedItem, setSelectedItem, setSelectedProfile } = useContext(AppContext);
  const [tips, setTips] = useState([]);
  const pathname = usePathname();
  const communityDrawerNavigation = useNavigation();


  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  useEffect(() => {
    if (selectedItem.is_done) {
      amplitude.track("Owned Tips Section Viewed");
    } else {
      amplitude.track("Community Tips Section Viewed");
    }
  }, [pathname]);

  const saveAllTips = async (latestTips) => {
    //console.log("saveAllTips started...");
    if (latestTips && latestTips.length > 0) {

      // Asynchronously sync DB with latest tips
      saveTips(selectedItem, latestTips, () => {
        ListItemEventEmitter.emit(LIST_ITEM_EVENT__UPDATE_COUNTS);
      });
    }
  };

  const saveTextUpdate = async (tip) => {
    updateTipText(tip);
  }

  const saveTipOrder = async (uuidArray) => {
    updateTipOrder(selectedItem, uuidArray);
  }

  useEffect(() => {
    if (selectedItem && !selectedItem.is_done && (tips.length == 0)) {
      console.log("Inside empty tips case on useEffect([tips])")
      // If we reached this page with an empty tips page, we
      // may have just discovered that there are no tips for this
      // item from users that the user hasn't blocked.
      // We assume this is the case and will navigate them back to the items page.
      //router.back();
      // TODO:  Needs to be done _after_ load attempt occurs (need loadAllthings callback?)
    }
  }, [tips])

  const handleDoneClick = async () => {
    amplitude.track("Selected Item Done Clicked", {
      anonymous_id: anonymousId.current
    });

    // For now just navigate user back to full list if they press this
    router.back();
  }

  const handleTipVote = async (tip, voteValue: number) => {

    amplitude.track("Tip Voted", {
      anonymous_id: anonymousId.current,
      tip_uuid: tip.uuid,
      vote_value: voteValue
    });

    // v1.1.1 TODO:  Remove commented code after completing testing of new state-mutation approach
    //const updatedTips = [...tips];
    if (tip.user_vote_value == voteValue) {

      // v1.1.1 TODO:  Remove commented code after completing testing of new state-mutation approach
      // updatedTips[index].upvote_count += (tip.user_vote_value * -1);  // Cancel their previous vote in UI
      // updatedTips[index].user_vote_value = 0; // Drives UI logic indicating which direction user voted, if any

      // Clear their vote if they tap the same direction again
      setTips((prevTips) =>
        prevTips.map((prevTip) =>
          (prevTip.uuid == tip.uuid)
            ? {
              ...prevTip,
              upvote_count: prevTip.upvote_count + (tip.user_vote_value * -1),
              user_vote_value: 0
            }
            : prevTip));

      // Asynchronously send tip vote to backend 
      tipVote(tip.uuid, 0);
    } else {

      // v1.1.1 TODO:  Remove commented code after completing testing of new state-mutation approach
      // updatedTips[index].upvote_count += (tips[index].user_vote_value == (voteValue * -1)) ? (tips[index].user_vote_value * -1) + voteValue : voteValue;
      // updatedTips[index].user_vote_value = voteValue;

      // If user is voting in the opposite direction of their current vote, cancel their current vote first before adding the new vote
      setTips((prevTips) =>
        prevTips.map((prevTip) =>
          (prevTip.uuid == tip.uuid)
            ? {
              ...prevTip,
              upvote_count: prevTip.upvote_count + ((tip.user_vote_value == (voteValue * -1)) ? (tip.user_vote_value * -1) + voteValue : voteValue),
              user_vote_value: voteValue
            }
            : prevTip));

      // Asynchronously send tip vote to backend 
      tipVote(tip.uuid, voteValue);
    }

  }

  const handleTipFlag = async (tip) => {

    amplitude.track("Tip Flag Started", {
      anonymous_id: anonymousId.current,
      tip_uuid: tip.uuid
    });

    Alert.alert(
      'Report Abuse', // Title of the alert
      'Are you sure you want to report this tip as abusive? Reporting helps us keep our community safe. Your report will remain anonymous.', // Message of the alert
      [
        {
          text: 'Cancel',
          onPress: () => {
            //console.log('Tip Flag Cancel Pressed');
            amplitude.track("Tip Flag Cancelled", {
              anonymous_id: anonymousId.current,
              tip_uuid: tip.uuid
            });
          },
          style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
        },
        {
          text: 'Yes',
          onPress: () => {
            //console.log('Tip Flag OK Pressed');
            handleFlagTip(tip);
          },
        },
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  }

  const handleFlagTip = async (tip) => {

    amplitude.track("Tip Flag Completed", {
      anonymous_id: anonymousId.current,
      tip_uuid: tip.uuid
    });

    // Asynchronously send tip flag to backend
    flagTip(tip.uuid);

    setTips((prevTips) => prevTips.map((obj) =>
      (obj.uuid == tip.uuid)
        ? { ...obj, is_flagged: true }
        : obj));

    Alert.alert(
      'Abuse Reported', // Title of the alert
      'Thank you for helping to keep the community safe!', // Message of the alert
      [
        {
          text: 'OK',
          //onPress: () => console.log('Tip Flag Cancel Pressed'),
          style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
        }
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  }

  const handleTipProfileClick = (tip) => {

    amplitude.track("Tip Profile Tapped", {
      anonymous_id: anonymousId.current,
      username: tip.name
    });

    setSelectedProfile({ name: tip.name });
    communityDrawerNavigation.openDrawer();

  }

  const renderRightActions = (tip, handleThingDeleteFunc) => {
    return (
      <>
        {(selectedItem.is_done) ?
          <Reanimated.View style={[listStyles.itemSwipeAction, styles.action_Delete]}>
            <Pressable
              onPress={() => handleThingDeleteFunc(tip)}>
              <Image style={listStyles.swipeActionIcon} source={require("@/assets/images/trash_icon_white.png")} />
            </Pressable>
          </Reanimated.View>
          :
          <>
            <Reanimated.View style={[listStyles.itemSwipeAction, styles.action_Upvote, (tip.user_vote_value == 1) && styles.action_vote_selected]}>
              <Pressable
                onPress={() => { handleTipVote(tip, 1) }}>
                <Image style={styles.voteThumbIcon} source={require("@/assets/images/thumbs_up_white.png")} />
              </Pressable>
            </Reanimated.View>
            <Reanimated.View style={[listStyles.itemSwipeAction, styles.action_Downvote, (tip.user_vote_value == -1) && styles.action_vote_selected]}>
              <Pressable
                onPress={() => { handleTipVote(tip, -1) }}>
                <Image style={styles.voteThumbIcon} source={require("@/assets/images/thumbs_down_white.png")} />
              </Pressable>
            </Reanimated.View>
            <Reanimated.View style={[listStyles.itemSwipeAction, styles.action_Flag]}>
              <Pressable
                onPress={() => { handleTipFlag(tip) }}>
                <Image style={listStyles.swipeActionIcon} source={require("@/assets/images/flag_white.png")} />
              </Pressable>
            </Reanimated.View>
          </>
        }
      </>
    );
  };

  const renderLeftActions = (tip, index) => {
    return (
      <>
        {(tip.name) ?
          <Reanimated.View style={styles.itemSwipeArea}>
            <Pressable
              onPress={() => handleTipProfileClick(tip)}>
              <View style={[styles.tipProfileContainer]}>
                <View style={styles.tipProfileIconContainer}>
                  <Image style={styles.tipProfileIcon} source={require("@/assets/images/profile_icon_red.png")} />
                </View>
                <View style={styles.tipProfileNameContainer}>
                  <Text style={styles.tipProfileName}>{tip.name}</Text>
                </View>
              </View>
            </Pressable>
          </Reanimated.View>
          : <></>
        }
      </>
    );
  };

  const styles = StyleSheet.create({
    listContainer: {                  // Appends to listStyles.listContainer
      backgroundColor: '#EBDDC5'
    },
    headerItemContainer: {
      backgroundColor: "#DCC7AA",
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333',
      paddingTop: 4,
    },
    itemContainer: {                 // Appends to listStyle.itemContainer
      marginLeft: 14
    },
    swipeableContainer: {
      backgroundColor: '#EBDDC5'
    },
    itemCircleOpen: {
      width: 26,
      height: 26,
      borderRadius: 13, // Half of the width and height for a perfect circle
      borderColor: 'black',
      borderWidth: 2,
      backgroundColor: 'white',
      marginLeft: 15
    },
    itemCircleOpen_isDone: {
      backgroundColor: '#556B2F50',
      borderWidth: 0
    },
    headerItemNameContainer: {
      paddingLeft: 18,
      paddingBottom: 10,
      paddingTop: 10,
      paddingRight: 20,
      flex: 1,
      flexDirection: 'row'
    },
    tipNameContainer: {
      marginTop: 4,
      paddingBottom: 10,
      paddingTop: 10,
      paddingRight: 10,
      flex: 1,
      flexDirection: 'row'
    },
    tipNamePressable: {
      flex: 1,
      width: '100%'
    },
    action_Upvote: {
      backgroundColor: '#556B2F'
    },
    action_Downvote: {
      backgroundColor: '#A23E48'
    },
    action_vote_selected: {
      borderWidth: 2,
      borderColor: 'white'
    },
    scoreContainer: {
      justifyContent: 'flex-end',
      alignItems: 'center',
      flexDirection: 'row',
      width: 80
    },
    scoreText: {
      fontSize: 16,
      paddingRight: 10
    },
    scoreIcon: {
      width: 16,
      height: 16,
      opacity: 0.5
    },
    voteThumbIcon: {
      width: 30,
      height: 30
    },
    voteIconContainer: {
      //opacity: 0.6
    },
    voteCountContainer: {

    },
    voteCountText: {
      paddingLeft: 10,
      paddingRight: 10,
      fontSize: 15,
      textAlign: 'center'
    },
    action_Delete: {
      backgroundColor: 'red',
      borderRightWidth: 1,
      borderRightColor: '#3E272333',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333'
    },
    action_Flag: {
      backgroundColor: 'red',
      borderRightWidth: 1,
      borderRightColor: '#3E272333',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333'
    },
    flaggedContainer: {
      justifyContent: 'flex-end',
      alignItems: 'center',
      flexDirection: 'row',
      width: 80,
      paddingRight: 10
    },
    flaggedText: {
      fontSize: 12,
      color: '#A23E48',
      fontWeight: 'bold',
      paddingRight: 10
    },
    flaggedIcon: {
      height: 20,
      width: 20,
      opacity: 0.8
    },
    itemSwipeArea: {
      position: 'relative'
    },
    tipProfileContainer: {
      height: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 10,
      paddingRight: 15,
      backgroundColor: '#FAF3E0'
    },
    tipProfileIconContainer: {
      paddingLeft: 5,
      paddingRight: 10
    },
    tipProfileIcon: {
      width: 30,
      height: 30
    },
    tipProfileNameContainer: {

    },
    tipProfileName: {

    },
    tipListIconContainer: {

    },
    tipListIcon: {
      width: 28,
      height: 28,
      opacity: 1
    }
  });

  if (selectedItem == null) {
    console.log("Selected Item is null, aborting render of tips page");
    return;
  } else {

    return (
      <>
        <View style={styles.headerItemContainer}>
          <Pressable style={[styles.itemCircleOpen, selectedItem.is_done && styles.itemCircleOpen_isDone]} onPress={() => handleDoneClick()}></Pressable>
          <View style={styles.headerItemNameContainer}>
            <View style={listStyles.itemNamePressable}>
              <Text style={[listStyles.taskTitle, selectedItem.is_done && listStyles.taskTitle_isDone]}>{selectedItem.text}</Text>
            </View>
            <DootooItemSidebar thing={selectedItem} styles={styles} />
          </View>
        </View>
        <DootooList
          thingName="tip"
          loadingAnimMsg={(selectedItem.is_done) ? "Loading your tips to the community" : "Loading tips from the community"}
          listArray={tips}
          listArraySetter={setTips}
          styles={styles}
          isDoneable={false}
          renderRightActions={renderRightActions}
          renderLeftActions={renderLeftActions}
          saveAllThings={saveAllTips}
          saveTextUpdateFunc={saveTextUpdate}
          saveThingOrderFunc={saveTipOrder}
          loadAllThings={(isPullDown) => loadTips(isPullDown, selectedItem.uuid)}
          deleteThing={(tip_uuid) => {
            deleteTip(tip_uuid);

            // Update tip count in displayed header
            setSelectedItem((prevItem) => ({ ...prevItem, tip_count: prevItem.tipCount - 1 }));

            ProfileCountEventEmitter.emit('decr_tips');
          }}
          saveNewThing={(tip, latest_tip_uuids) => saveNewTip(tip, selectedItem.uuid, latest_tip_uuids)}
          transcribeAudioToThings={transcribeAudioToTips}
          ListThingSidebar={DootooTipSidebar}
          EmptyThingUX={() => <DootooTipEmptyUX selectedItem={selectedItem} tipArray={tips} />}
          isThingPressable={() => { return selectedItem.is_done; }}
          isThingDraggable={selectedItem.is_done}
          hideRecordButton={!selectedItem.is_done}
          shouldInitialLoad={selectedItem.tip_count && (Number(selectedItem.tip_count) > 0)} />
      </>
    );
  }
}