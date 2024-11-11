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
import { loadTips, saveTips, tipVote, flagTip, updateTipText, deleteTip, saveItems } from '../components/Storage';
import DootooTipSidebar from "../components/DootooTipSidebar";
import DootooTipEmptyUX from "../components/DootooTipEmptyUX";
import DootooList from "@/components/DootooList";
import DootooSwipeAction_Delete from "@/components/DootooSwipeAction_Delete";

export default function ItemTips() {
  const { setLastRecordedCount, updateUserCountContext, 
    selectedItem, setSelectedItem } = useContext(AppContext);
  const [tips, setTips] = useState([]);


  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  const saveAllTips = async (latestTips) => {
    if (latestTips && latestTips.length > 0) {
      console.log(`Passing ${tips.length} tips to saveTips method...`);
      await saveTips(selectedItem, latestTips, () => {
        updateUserCountContext()

        // Update tip count of selectedItem
        const updatedSelectedItem = selectedItem;
        updatedSelectedItem.tip_count = latestTips.length;
        setSelectedItem(updatedSelectedItem);
        console.log("Updated selected Item with new tip count: " +  updatedSelectedItem.tip_count);
      });
      console.log("Tip save successful.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (selectedItem == null) {
        //console.log("Aborting useFocusEffect call on null selected item");
        return;
      }
      //console.log("Selected item: " + JSON.stringify(selectedItem));

      return () => {
        //console.log('User has navigated away from this tips route - Nulling out selectedItem context.');
        setSelectedItem(null);
      }
    }, [])
  );

  const handleDoneClick = async () => {
    setLastRecordedCount(0);
    console.log("Calling saveItems for selectedItem to undone it...");
    const updatedSelectedItem = selectedItem;
    updatedSelectedItem.is_done = false;
    const oneItemList = [updatedSelectedItem]
    await saveItems(oneItemList, (updatedItems) => {
      console.log("Updating user counts asyncronously after saving undone selected item")
      updateUserCountContext();
    });
    console.log("saveItems call for undone item successful.");
    console.log("Attempting to navigate back to main index list.");
    router.back();
  }

  const handleTipVote = async (index, voteValue: number) => {
    await tipVote(tips[index].uuid, voteValue);
    const updatedTips = [...tips];
    updatedTips[index].upvote_count += voteValue  // This value will be overwritten by DB load Just force a reload to reorder list as needed
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
    await flagTip(tips[index].uuid);
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
            <Reanimated.View style={styles.voteContainer}>
              <Pressable style={styles.voteIconContainer}
                onPress={() => { handleTipVote(index, 1) }}>
                <Image style={[styles.voteThumbIcon, (tips[index].user_vote_value == 1) && { opacity: 1.0 }]} source={require("../assets/images/thumbs_up_556B2F.png")} />
              </Pressable>
              <View style={styles.voteCountContainer}>
                <Text style={styles.voteCountText}>{tips[index].upvote_count}</Text>
              </View>
              <Pressable style={styles.voteIconContainer}
                onPress={() => { handleTipVote(index, -1) }}>
                <Image style={[styles.voteThumbIcon, (tips[index].user_vote_value == -1) && { opacity: 1.0 }]} source={require("../assets/images/thumbs_down_A23E48.png")} />
              </Pressable>
            </Reanimated.View>
            <Reanimated.View style={[styles.itemSwipeAction, styles.action_Flag]}>
              <Pressable
                onPress={() => { handleTipFlag(index) }}>
                <Image style={styles.swipeActionIcon_flag} source={require("../assets/images/flag_A23E48.png")} />
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
      bottom: 0,
      right: 80,
      height: 150,
      width: 50,
      opacity: 0.4,
      transform: [{ rotate: '18deg' }]
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
    itemContainer: {
      flexDirection: 'row', // Lays out children horizontally
      alignItems: 'center', // Aligns children vertically (centered in this case)
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333' //#322723 with approx 20% alpha
    },
    listContainer: {
      flex: 1,
      backgroundColor: '#EBDDC5'
    },
    swipeableContainer: {
      backgroundColor: '#EBDDC5'
    },
    tipContainer: {
      flexDirection: 'row', // Lays out children horizontally
      alignItems: 'center', // Aligns children vertically (centered in this case)
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333', //#322723 with approx 20% alpha
      marginLeft: 20
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
      marginLeft: 15,
      paddingBottom: 10,
      paddingTop: 10,
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
    action_Delete: {
      backgroundColor: 'red',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333'
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
      paddingRight: 15,
      flexDirection: 'row'
    },
    similarCountText: {
      fontSize: 15
    },
    similarCountIcon: {
      width: 28,
      height: 28,
      opacity: 0.6
    },
    scoreContainer: {
      justifyContent: 'flex-end',
      alignItems: 'center',
      flexDirection: 'row',
      width: 80,
      paddingRight: 10
    },
    scoreText: {
      fontSize: 16,
      paddingRight: 10
    },
    scoreIcon: {
      width: 28,
      height: 28,
      opacity: 0.5
    },
    voteThumbIcon: {
      width: 28,
      height: 28,
      opacity: 0.2
    },
    swipeActionIcon_trash: {
      height: 30,
      width: 30
    },
    swipeActionIcon_flag: {
      height: 20,
      width: 20,
      opacity: 0.6
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
      paddingRight: 15,
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
    voteContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingRight: 20,
      paddingLeft: 20,
      backgroundColor: '#FAF3E090',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333'
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
      backgroundColor: '#FAF3E090',
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
          <View style={styles.itemContainer}>
            <Pressable style={[styles.itemCircleOpen, selectedItem.is_done && styles.itemCircleOpen_isDone]} onPress={() => handleDoneClick()}></Pressable>
            <View style={styles.itemNameContainer}>
              <View style={styles.itemNamePressable}>
                <Text style={[styles.taskTitle, selectedItem.is_done && styles.taskTitle_isDone]}>{selectedItem.text}</Text>
              </View>
              {
                (selectedItem.tip_count && selectedItem.tip_count > 0) ?
                  <View style={styles.tipCountContainer}>
                    <Text style={styles.tipCountText}>{selectedItem.tip_count}</Text>
                    <View style={styles.tipCountIcon}></View>
                  </View> : <></>
              }
              {
                (selectedItem.similar_count && selectedItem.similar_count > 0) ?
                  <View style={styles.similarCountContainer}>
                    <Text style={styles.similarCountText}>{selectedItem.similar_count}</Text>
                    <Image style={styles.similarCountIcon} source={require("../assets/images/person_icon_556B2F.png")} />
                  </View> : <></>
              }
            </View>
          </View>
          <DootooList thingName="tip" listArray={tips}
            listArraySetter={setTips}
            styles={styles}
            isDoneable={false}
            renderRightActions={renderRightActions}
            saveAllThings={saveAllTips}
            loadAllThings={() => loadTips(selectedItem.uuid)}
            updateThingText={updateTipText}
            transcribeAudioToThings={transcribeAudioToTips}
            ListThingSidebar={(thing, styles, index) => <DootooTipSidebar styles={styles} listArray={tips} thing={thing} listThingIndex={index} />}
            EmptyThingUX={() => <DootooTipEmptyUX styles={styles} ThingToDriveEmptyListCTA={selectedItem} />}
            isThingPressable={(item) => { return (item.user_id == selectedItem.user_id); }}
            isThingDraggable={(data) => { return data[0].user_id == selectedItem.user_id; }} />
        </View>
      </View>
    );
  }
}