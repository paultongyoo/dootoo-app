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
import { loadTips, saveTips, tipVote, flagTip, deleteTip, updateTipText, updateTipOrder } from '@/components/Storage';
import DootooTipSidebar from "@/components/DootooTipSidebar";
import DootooTipEmptyUX from "@/components/DootooTipEmptyUX";
import DootooList from "@/components/DootooList";
import DootooSwipeAction_Delete from "@/components/DootooSwipeAction_Delete";
import DootooItemSidebar from "@/components/DootooItemSidebar";
import * as amplitude from '@amplitude/analytics-react-native';
import { ProfileCountEventEmitter } from "@/components/EventEmitters";


export default function ItemTips() {
  const router = useRouter();
  const { anonymousId, selectedItem, setSelectedItem, selectedProfile } = useContext(AppContext);
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

      // Immediately update displayed tip count within selected item header
      setSelectedItem((prevItem) => ({ ...prevItem, tip_count: latestTips.length }));

      //console.log(`Passing ${latestTips.length} tips to saveTips method...`);

      // Asynchronously sync DB with latest tips
      saveTips(selectedItem, latestTips, () => {

        // Fix validation for v1.1.1 race condition
        // updateUserCountContext();

        //console.log("saveAllTips successful.");
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
              ? { ...prevTip, 
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
              ? { ...prevTip, 
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
              ? { ...obj, is_flagged: true}
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

    selectedProfile.current = { name: tip.name };
    communityDrawerNavigation.openDrawer();

  }

  const renderRightActions = (tip, index) => {
    return (
      <>
        {(selectedItem.is_done) ?
          <DootooSwipeAction_Delete
            thingNameStr="Tip"
            styles={styles}
            listArray={tips} listArraySetter={setTips}
            listThing={tip}
            deleteThing={(tip_uuid) => {
              deleteTip(tip_uuid);

              // Update tip count in displayed header
              setSelectedItem((prevItem) => ({ ...prevItem, tip_count: prevItem.tipCount - 1}));

              ProfileCountEventEmitter.emit('decr_tips');
            }} />
          :
          <>
            <Reanimated.View style={[styles.itemSwipeAction, styles.action_Upvote, (tip.user_vote_value == 1) && styles.action_vote_selected]}>
              <Pressable
                onPress={() => { handleTipVote(tip, 1) }}>
                <Image style={styles.voteThumbIcon} source={require("@/assets/images/thumbs_up_white.png")} />
              </Pressable>
            </Reanimated.View>
            <Reanimated.View style={[styles.itemSwipeAction, styles.action_Downvote, (tip.user_vote_value == -1) && styles.action_vote_selected]}>
              <Pressable
                onPress={() => { handleTipVote(tip, -1) }}>
                <Image style={styles.voteThumbIcon} source={require("@/assets/images/thumbs_down_white.png")} />
              </Pressable>
            </Reanimated.View>
            <Reanimated.View style={[styles.itemSwipeAction, styles.action_Flag]}>
              <Pressable
                onPress={() => { handleTipFlag(tip) }}>
                <Image style={styles.swipeActionIcon_flag} source={require("@/assets/images/flag_white.png")} />
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
    container: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "#DCC7AA",
      paddingTop: (Platform.OS == 'ios') ? 100 : 75
    },
    initialLoadAnimContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: 30,
      paddingRight: 60
    },
    emptyListContainer_words: {
      fontSize: 40,
      lineHeight: 48
    },
    emptyListContainer_arrow: {
      position: 'absolute',
      bottom: -50,
      right: 90,
      height: 175,
      width: 50,
      opacity: 0.4,
      transform: [{ rotate: '20deg' }]
    },
    taskContainer: {
      flex: 1
    },
    taskTitle: {
      fontSize: 16,
      textAlign: 'left',
      paddingTop: 5,
      paddingBottom: 5,
      paddingRight: 5
    },
    taskTitle_isDone: {
      color: '#556B2F',
      textDecorationLine: 'line-through'
    },
    headerItemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333',
      paddingTop: 4
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      // borderBottomWidth: 1,
      // borderBottomColor: '#3E272333',
      marginLeft: 14
    },
    listContainer: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: '#EBDDC5'
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
      backgroundColor: '#556B2F50'
    },
    itemNameContainer: {
      paddingBottom: 10,
      paddingTop: 10,
      paddingRight: 20,
      marginLeft: 17,
      flex: 1,
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333'
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
    itemNamePressable: {
      flex: 1,
      width: '100%',
      paddingRight: 10
    },
    tipNamePressable: {
      flex: 1,
      width: '100%'
    },
    itemTextInput: {
      fontSize: 16,
      padding: 5,
      paddingRight: 25,
      flex: 1
    },
    itemSwipeAction: {
      width: 70,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      backgroundColor: '#FAF3E0'
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
    itemLeftSwipeActions: {
      width: 50,
      backgroundColor: 'green',
      justifyContent: 'center',
      alignItems: 'center'
    },
    errorTextContainer: {
      padding: 20
    },
    errorText: {
      color: 'red',
      fontSize: 10
    },
    similarCountContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      paddingLeft: 15
    },
    similarCountText: {
      fontSize: 15
    },
    similarCountIcon: {
      width: 16,
      height: 16,
      opacity: 0.45,
      marginLeft: 10
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
    swipeActionIcon_trash: {
      height: 30,
      width: 30
    },
    swipeActionIcon_flag: {
      height: 30,
      width: 30
    },
    swipeActionIcon_ident: {
      height: 30,
      width: 30
    },
    giveTipContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingRight: 15,
      flexDirection: 'row'
    },
    giveTipIcon: {
      height: 30,
      width: 50
    },
    giveTipText: {
      fontSize: 15,
      paddingRight: 10
    },
    tipCountContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row'
    },
    tipCountText: {
      fontSize: 15
    },
    tipCountIcon: {
      width: 16,
      height: 16,
      borderRadius: 8, // Half of the width and height for a perfect circle
      borderColor: '#3E2723',
      backgroundColor: '#556B2F60',
      marginLeft: 10
    },
    tipCountImageIcon: {
      height: 16,
      width: 16,
      opacity: 0.5,
      marginLeft: 8
    },
    initialLoadMsg: {
      fontSize: 20,
      paddingBottom: 15
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
    itemCountsRefreshingAnimContainer: {
      justifyContent: 'center'
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
      <View style={styles.container}>
        <View style={styles.taskContainer}>
          <View style={styles.headerItemContainer}>
            <Pressable style={[styles.itemCircleOpen, selectedItem.is_done && styles.itemCircleOpen_isDone]} onPress={() => handleDoneClick()}></Pressable>
            <View style={styles.headerItemNameContainer}>
              <View style={styles.itemNamePressable}>
                <Text style={[styles.taskTitle, selectedItem.is_done && styles.taskTitle_isDone]}>{selectedItem.text}</Text>
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
            loadAllThings={(page) => loadTips(selectedItem.uuid, page)}
            transcribeAudioToThings={transcribeAudioToTips}
            ListThingSidebar={DootooTipSidebar}
            EmptyThingUX={() => <DootooTipEmptyUX styles={styles} selectedItem={selectedItem} tipArray={tips} />}
            isThingPressable={() => { return selectedItem.is_done; }}
            isThingDraggable={selectedItem.is_done}
            hideRecordButton={!selectedItem.is_done}
            shouldInitialLoad={selectedItem.tip_count && (Number(selectedItem.tip_count) > 0)} />
        </View>
      </View>
    );
  }
}