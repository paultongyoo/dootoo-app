import {
  Image, Text, View, StyleSheet, Pressable, Alert
} from "react-native";
import { useState, useContext, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import Reanimated, {
  SharedValue,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { AppContext } from '../components/AppContext';
import { transcribeAudioToTips } from '../components/BackendServices';
import { loadTips, saveTips, tipVote, flagTip, deleteTip } from '../components/Storage';
import DootooTipSidebar from "../components/DootooTipSidebar";
import DootooTipEmptyUX from "../components/DootooTipEmptyUX";
import DootooList from "@/components/DootooList";
import DootooSwipeAction_Delete from "@/components/DootooSwipeAction_Delete";
import DootooItemSidebar from "@/components/DootooItemSidebar";

export default function ItemTips() {
  const { setLastRecordedCount, updateUserCountContext,
    selectedItem, setSelectedItem } = useContext(AppContext);
  const [tips, setTips] = useState([]);


  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  const saveAllTips = async (latestTips) => {
    console.log("saveAllTips started...");
    if (latestTips && latestTips.length > 0) {

      // Immediately update displayed tip count within selected item header
      const updatedSelectedItem = selectedItem;
      updatedSelectedItem.tip_count = latestTips.length;
      setSelectedItem(updatedSelectedItem);

      console.log(`Passing ${latestTips.length} tips to saveTips method...`);

      // Asynchronously sync DB with latest tips
      saveTips(selectedItem, latestTips, () => {
        updateUserCountContext();
        console.log("saveAllTips successful.");
      });
    }
  };

  const saveSingleTip = async (tip) => {
    console.log("saveSingleTip started...");
    // Asynchronously sync DB with latest tips
    saveTips(selectedItem, [tip], () => {
      updateUserCountContext();
      console.log("saveSingleTip successful.");
    });
  }

  useFocusEffect(
    useCallback(() => {
      if (selectedItem == null) {
        //console.log("Aborting useFocusEffect call on null selected item");
        return;
      }
      //console.log("Selected item: " + JSON.stringify(selectedItem));

      return () => {
        //console.log('User has navigated away from this tips route - Nulling out selectedItem and tips contexts.');
        setSelectedItem(null);
        setTips([]);
        setLastRecordedCount(0);
      }
    }, [])
  );

  const handleDoneClick = async () => {
    setLastRecordedCount(0);
    // For now just navigate user back to full list if they press this
    router.back();
  }

  const handleTipVote = async (index, voteValue: number) => {

    const updatedTips = [...tips];
    if (tips[index].user_vote_value == voteValue) {

      // Clear their vote if they tap the same direction again
      updatedTips[index].upvote_count += (tips[index].user_vote_value * -1);  // Cancel their previous vote in UI
      updatedTips[index].user_vote_value = 0; // Drives UI logic indicating which direction user voted, if any

      // Asynchronously send tip vote to backend 
      tipVote(tips[index].uuid, 0);
    } else {

      // If user is voting in the opposite direction of their current vote, cancel their current vote first before adding the new vote
      updatedTips[index].upvote_count += (tips[index].user_vote_value == (voteValue * -1)) ? (tips[index].user_vote_value * -1) + voteValue : voteValue;   
      updatedTips[index].user_vote_value = voteValue; 

      // Asynchronously send tip vote to backend 
      tipVote(tips[index].uuid, voteValue);
    }
    setTips(updatedTips);
  }

  const handleTipFlag = async (index: number) => {
    Alert.alert(
      'Report Abuse', // Title of the alert
      'Are you sure you want to report this tip as abusive? Reporting helps us keep our community safe. Your report will remain anonymous.', // Message of the alert
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Tip Flag Cancel Pressed'),
          style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
        },
        {
          text: 'Yes',
          onPress: () => {
            console.log('Tip Flag OK Pressed');
            handleFlagTip(index);
          },
        },
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  }

  const handleFlagTip = async (index) => {

    // Asynchronously send tip flag to backend
    flagTip(tips[index].uuid);

    const updatedTips = [...tips];
    updatedTips[index].is_flagged = true;
    setTips(updatedTips);

    Alert.alert(
      'Abuse Reported', // Title of the alert
      'Thank you for helping to keep the community safe!', // Message of the alert
      [
        {
          text: 'OK',
          onPress: () => console.log('Tip Flag Cancel Pressed'),
          style: 'cancel', // Optional: 'cancel' or 'destructive' (iOS only)
        }
      ],
      { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
    );
  }

  const renderRightActions = (progress: SharedValue<number>, dragX: SharedValue<number>, index: number) => {
    return (
      <>
        {(tips[index].user_id == selectedItem.user_id) ?
          <DootooSwipeAction_Delete
            styles={styles}
            listArray={tips} listArraySetter={setTips}
            listThingIndex={index}
            deleteThing={deleteTip} />
          :
          <>
            <Reanimated.View style={[styles.itemSwipeAction, styles.action_Upvote, (tips[index].user_vote_value == 1) && styles.action_vote_selected]}>
              <Pressable
                onPress={() => { handleTipVote(index, 1) }}>
                <Image style={styles.voteThumbIcon} source={require("../assets/images/thumbs_up_white.png")} />
              </Pressable>
            </Reanimated.View>
            <Reanimated.View style={[styles.itemSwipeAction, styles.action_Downvote, (tips[index].user_vote_value == -1) && styles.action_vote_selected]}>
              <Pressable
                onPress={() => { handleTipVote(index, -1) }}>
                <Image style={styles.voteThumbIcon} source={require("../assets/images/thumbs_down_white.png")} />
              </Pressable>
            </Reanimated.View>
            <Reanimated.View style={[styles.itemSwipeAction, styles.action_Flag]}>
              <Pressable
                onPress={() => { handleTipFlag(index) }}>
                <Image style={styles.swipeActionIcon_flag} source={require("../assets/images/flag_white.png")} />
              </Pressable>
            </Reanimated.View>
          </>
        }
      </>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: "#DCC7AA"
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
      padding: 5
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
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333',
      marginLeft: 25
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
      flex: 1,
      flexDirection: 'row'
    },
    headerItemNameContainer: {
      paddingLeft: 15,
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
      width: '100%'
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
    }
  });

  if (selectedItem == null) {
    //console.log("Selected Item is null, aborting render of tips page");
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
            saveAllThings={saveAllTips}
            saveSingleThing={saveSingleTip}
            loadAllThings={() => loadTips(selectedItem.uuid)}
            transcribeAudioToThings={transcribeAudioToTips}
            ListThingSidebar={DootooTipSidebar}
            EmptyThingUX={() => <DootooTipEmptyUX styles={styles} ThingToDriveEmptyListCTA={selectedItem} />}
            isThingPressable={(item) => { return (item.user_id == selectedItem.user_id); }}
            isThingDraggable={(data) => { return data[0].user_id == selectedItem.user_id; }}
            hideRecordButton={!selectedItem.is_done}
            shouldInitialLoad={selectedItem.tip_count && (Number(selectedItem.tip_count) > 0)} />
        </View>
      </View>
    );
  }
}