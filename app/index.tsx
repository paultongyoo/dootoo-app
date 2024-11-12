import { useContext } from "react";
import { router } from 'expo-router';
import { saveItems, loadItems, deleteItem, updateItemHierarchy } from '../components/Storage';
import { transcribeAudioToTasks } from './../components/BackendServices';
import DootooItemEmptyUX from "../components/DootooItemEmptyUX";
import DootooList from "../components/DootooList";
import DootooItemSidebar from "../components/DootooItemSidebar";
import DootooSwipeAction_Delete from "../components/DootooSwipeAction_Delete";

import {
  Image, StyleSheet, Pressable
} from "react-native";
import { AppContext } from '../components/AppContext';
import Reanimated, {
  SharedValue,
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

export default function Index() {
  const { dootooItems, setDootooItems,
    setLastRecordedCount, setSelectedItem,
    updateUserCountContext, queue } = useContext(AppContext);

  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false
  });

  const saveAllItems = async (latestItems) => {
   // console.log("saveAllItems called with latestItems length: " + dootooItems.length);
    if (latestItems && latestItems.length > 0) {
      //console.log(`Passing ${latestItems.length} to saveItems method...`);

      //console.log("saveAllItems started...");
      // Asynchronously sync DB with latest items
      saveItems(latestItems, (updatedItems) => {

          //console.log("Updating user counts asyncronously after saving all items")
          updateUserCountContext();

          // Apply latest counts to displayed list without affecting list order
          // This is hack workaround to avoid jolting behavior if/when
          // item order changes
          var displayedListToUpdate = refreshItemCounts(latestItems, updatedItems);
          setDootooItems(displayedListToUpdate);
          //console.log("saveAllItems finished...");
        });
      //console.log("saveAllItems successful.");
    }
  };

  const saveSingleItem = async (item) => {
    console.log("saveSingleItem started...");
    // The DootooList component will have set the "counts_updating" flag 
    // prior to calling back end to update this item so that we can
    // reset the flag after retrieving the latest tip/similar counts for the item
    // based on the updated text
    saveItems([item], (updatedItems) => {
      var displayedListToUpdate = refreshItemCounts(dootooItems, updatedItems);
      setDootooItems(displayedListToUpdate);
      console.log("saveSingleItem finished.");
    });
  }

  const handleMakeParent = (index: number) => {
    setLastRecordedCount(0);
    var updatedTasks = [...dootooItems];
    updatedTasks![index].is_child = false;

    // Asyncronously update item hierarhcy in DB
    updateItemHierarchy(updatedTasks![index].uuid, updatedTasks![index].is_child);

    setDootooItems(updatedTasks); // This should update UI only and not invoke any syncronous backend operations
  }

  const handleMakeChild = (index: number) => {
    setLastRecordedCount(0);
    var updatedTasks = [...dootooItems];
    updatedTasks![index].is_child = true;

    // Asyncronously update item hierarhcy in DB
    updateItemHierarchy(updatedTasks![index].uuid, updatedTasks![index].is_child);

    setDootooItems(updatedTasks); // This should update UI only and not invoke any syncronous backend operations
  }

  const handleDoneClick = (index: number) => {
    try {
      setLastRecordedCount(0);
      //console.log("Done clicked for item index: " + index);
      var updatedTasks = [...dootooItems];

      // Before making changes, remember index of first done item in the list, if any
      var firstDoneItemIdx = -1;
      for (var i = 0; i < updatedTasks.length; i++) {
        var currItem = updatedTasks[i];
        if (currItem.is_done) {
          firstDoneItemIdx = i;
          break;
        }
      }
      //console.log("firstDoneItemIdx before changing list: " + firstDoneItemIdx);

      updatedTasks![index].is_done = !updatedTasks![index].is_done;

      // Set this to instruct UI to hide item counts until async save op returns and removes the value
      updatedTasks![index].counts_updating = true;  

      if (updatedTasks![index].is_done == true) {

        //console.log(`Backing index of item ${updatedTasks![index].text}: ${index}`);
        updatedTasks![index].index_backup = index;

        // Move item to the bottom of the list
        const [item] = updatedTasks.splice(index, 1);   // remove the item
        updatedTasks = updatedTasks.concat(item);

      } else {
        const backupVal = updatedTasks![index].index_backup;
        const [item] = updatedTasks.splice(index, 1);   // remove the item
        if (backupVal != null && (backupVal > firstDoneItemIdx)) {
          //console.log("Placing item at firstDoneItemIdx: " + firstDoneItemIdx);
          updatedTasks.splice(firstDoneItemIdx, 0, item)  // insert it in new location
        } else {
          //console.log("Placing item at backup index: " + backupVal);
          updatedTasks.splice(backupVal, 0, item)  // insert it in new location
        }
      }

      // Asyncronously save all items to DB as rank_idxes will have changed
      saveAllItems(updatedTasks);

      setDootooItems(updatedTasks);  // This should update UI only and not invoke any synchronous backend operations
    } catch (error) {
      console.log("Error occurred during done logic!", error);
    }
  }

  const styles = StyleSheet.create({
    listContainer: {
      //padding: 10,
      flex: 1,
      justifyContent: "center",
      backgroundColor: "#DCC7AA"
      //alignItems: "center"
    },
    link: {
      fontWeight: 'bold',
      fontSize: 20,
      color: 'blue'
    },
    initialLoadAnimContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    initialLoadMsg: {
      paddingBottom: 15,
      fontSize: 20
    },
    emptyListContainer: {
      flex: 1,
      //flexDirection: 'row',
      //backgroundColor: 'yellow',
      justifyContent: 'center',
      paddingLeft: 20
    },
    emptyListContainer_words: {
      fontSize: 50
    },
    emptyListContainer_arrow: {
      position: 'absolute',
      bottom: -9,
      right: 100,
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
      alignItems: 'center' // Aligns children vertically (centered in this case)
    },
    itemContainer_firstItem: {
      paddingTop: 4
    },
    itemCircleOpen: {
      width: 26,
      height: 26,
      borderRadius: 13, // Half of the width and height for a perfect circle
      borderColor: '3E2723',
      borderWidth: 2,
      backgroundColor: 'white',
      marginLeft: 15
    },
    itemCircleOpen_isDone: {
      backgroundColor: '#556B2F50'
    },
    childItemSpacer: {
      width: 20
    },
    itemNameContainer: {
      marginLeft: 15,
      paddingBottom: 10,
      paddingTop: 10,
      paddingRight: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333', //#322723 with approx 20% alpha
      flex: 1,
      flexDirection: 'row'
    },
    itemNamePressable: {
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
      borderBottomColor: '#3E272333' //#322723 with approx 20% alpha
    },
    action_Give: {
      backgroundColor: '#556B2F',
      borderBottomWidth: 1,
      borderBottomColor: '#3E272333' //#322723 with approx 20% alpha
    },
    itemLeftSwipeActions: {
      width: 50,
      backgroundColor: 'green',
      justifyContent: 'center',
      alignItems: 'center'
    },
    swipeableContainer: {
      backgroundColor: '#DCC7AA'
    },
    errorTextContainer: {
      padding: 20
    },
    errorText: {
      color: 'red',
      fontSize: 10
    },
    itemNameSpaceFiller: {
      flex: 1
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
      //borderWidth: 1,
      borderColor: '#3E2723',
      backgroundColor: '#556B2F60',
      marginLeft: 10
    },
    swipeActionIcon_trash: {
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
    simliarTipsIcon: {
      height: 16,
      width: 16,
      borderRadius: 8,
      backgroundColor: 'white'
    },
    receiveTipIcon: {
      height: 40,
      width: 45
    },
    itemCountsRefreshingAnimContainer: {
      justifyContent: 'center'
    }
  });

  const renderRightActions = (progress: SharedValue<number>, dragX: SharedValue<number>, index: number) => {
    return (
      <>
        {(dootooItems![index].is_done) ?
          <Reanimated.View style={[styles.itemSwipeAction, styles.action_Give]}>
            <Pressable
              onPress={() => {
                console.log("Give Tips button tapped on item: " + dootooItems![index].text);
                setSelectedItem(dootooItems![index]);
                router.navigate('/tips');
              }}>
              <Image style={styles.giveTipIcon} source={require("../assets/images/give_icon_white.png")} />
            </Pressable>
          </Reanimated.View>
          : (dootooItems![index].tip_count && dootooItems![index].tip_count > 0) ?
            <Reanimated.View style={[styles.itemSwipeAction, styles.action_Give]}>
              <Pressable
                onPress={() => {
                  console.log("Similar Tips button tapped on item: " + dootooItems![index].text);
                  setSelectedItem(dootooItems![index]);
                  router.navigate('/tips');
                }}>
                {/* <View style={styles.simliarTipsIcon}></View> */}
                <Image style={styles.receiveTipIcon} source={require("../assets/images/receive_tip_white.png")} />
              </Pressable>
            </Reanimated.View>
            : <></>
        }
        <DootooSwipeAction_Delete
          styles={styles}
          listArray={dootooItems} listArraySetter={setDootooItems}
          listThingIndex={index}
          deleteThing={deleteItem} />
        {(dootooItems![index].is_child) ?
          <Reanimated.View style={[styles.itemSwipeAction]}>
            <Pressable
              onPress={() => handleMakeParent(index)}>
              <Image style={styles.swipeActionIcon_ident} source={require("../assets/images/left_outdent_3E2723.png")} />
            </Pressable>
          </Reanimated.View>
          : <></>
        }
      </>
    );
  };

  const renderLeftActions = (progress: SharedValue<number>, dragX: SharedValue<number>, index: number) => {
    return (
      <>
        {(!dootooItems![index].is_child && (index != 0) && (!dootooItems[index - 1].is_done)) ?
          <Reanimated.View style={[styles.itemSwipeAction]}>
            <Pressable
              onPress={() => handleMakeChild(index)}>
              <Image style={styles.swipeActionIcon_ident} source={require("../assets/images/left_indent_3E2723.png")} />
            </Pressable>
          </Reanimated.View>
          : <></>
        }
      </>
    );
  };

  return (
    <DootooList listArray={dootooItems}
                listArraySetter={setDootooItems}
                styles={styles}
                renderLeftActions={renderLeftActions}
                renderRightActions={renderRightActions}
                handleDoneClick={handleDoneClick}
                saveAllThings={saveAllItems}
                saveSingleThing={saveSingleItem}
                loadAllThings={loadItems}
                transcribeAudioToThings={transcribeAudioToTasks}
                ListThingSidebar={DootooItemSidebar}
                EmptyThingUX={DootooItemEmptyUX} 
                isThingPressable={() => { return true}} 
                isThingDraggable={() => { return true}} />
  );

  function refreshItemCounts(latestItems: any, updatedItems: any) {
    var displayedListToUpdate = [...latestItems];
    for (var i = 0; i < updatedItems.length; i++) {
      const currUpdatedItem = updatedItems[i];
      for (var j = 0; j < displayedListToUpdate.length; j++) {
        if (displayedListToUpdate[j].uuid == currUpdatedItem.uuid) {
          displayedListToUpdate[j].tip_count = currUpdatedItem.tip_count;
          displayedListToUpdate[j].similar_count = currUpdatedItem.similar_count;
          displayedListToUpdate[j].counts_updating = false;
          break;
        }
      }
    }
    return displayedListToUpdate;
  }
}

