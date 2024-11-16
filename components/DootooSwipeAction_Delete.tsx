import { Pressable, Image, Alert, Animated, Easing } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { AppContext } from './AppContext';
import { useContext } from 'react';
import * as amplitude from '@amplitude/analytics-react-native';

const DootooSwipeAction_Delete = ({
    styles, listArray, listArraySetter, listThingIndex,
    deleteThing, thingNameStr = "Item" }) => {
    const { anonymousId, setLastRecordedCount, thingRowPositionXs, thingRowHeights } = useContext(AppContext);

    const handleThingDelete = (index: number) => {
        console.log("Entering handle delete item...");
        setLastRecordedCount(0);
        var updatedThings = [...listArray];

        // If the thing is a parent and has one or more children, ask user if they want to remove all children too
        if (!listArray[index].is_child && ((index + 1) <= (listArray.length - 1)) && listArray[index + 1].is_child) {

            // Count how many subtasks this item has
            var numSubtasks = 0;
            for (var idx = index + 1; idx < listArray.length; idx++) {
                if (listArray[idx].is_child == true) {
                    numSubtasks += 1;
                } else {
                    break;
                }
            }
            Alert.alert(
                `${thingNameStr} Has ${numSubtasks} Sub${thingNameStr.toLowerCase()}${numSubtasks > 1 ? 's' : ''}`,
                `Deleting this ${thingNameStr.toLowerCase()} will delete its sub${thingNameStr.toLowerCase()}${numSubtasks > 1 ? 's' : ''} too.  Continue?`,
                [
                    {
                        text: 'Yes',
                        onPress: () => {

                            // Three step process:
                            // 1) Animate away the item and its subitems
                            // 2) Delete each item from backend
                            // 3) Remove each item from UI array
                            var animationArray = [];
                            for (var i = index; i <= index + numSubtasks; i++) {

                                // Call asyncronous delete to mark item as deleted in backend to sync database
                                deleteThing(updatedThings[i].uuid);

                                amplitude.track(`${thingNameStr} Deleted`, {
                                    anonymous_id: anonymousId,
                                    thing_uuid: updatedThings[i].uuid,
                                    thing_type: thingNameStr
                                });

                                // Add the animation to slide the item off the screen
                                animationArray.push(
                                    Animated.timing(thingRowPositionXs.current[i], {
                                        toValue: -600,
                                        duration: 300,
                                        easing: Easing.in(Easing.quad),
                                        useNativeDriver: false
                                    })
                                );

                                // // If the item is NOT the last item in the list, add the animatino
                                // // to shrink its height as well
                                // if (i < (updatedThings.length - 1)) {
                                //     Animated.timing(thingRowHeights.current[i], {
                                //         toValue: 0,
                                //         duration: 300,
                                //         easing: Easing.in(Easing.quad),
                                //         useNativeDriver: false
                                //     })   
                                // }
                            }
                            Animated.parallel(animationArray).start(() => {

                                updatedThings.splice(index, 1 + numSubtasks);  // Remove item and its subtasks from array
                                thingRowPositionXs.current.splice(index, 1 + numSubtasks);
                                thingRowHeights.current.splice(index, 1 + numSubtasks);

                                for (var i = index; i <= index + numSubtasks; i++) {
                                    if (updatedThings[i]) {
                                        updatedThings[i].resetHeight = true    
                                    }
                                    if (thingRowPositionXs.current[i]) {
                                        thingRowPositionXs.current[i].setValue(0);
                                    } 
                                }

                                listArraySetter(updatedThings); // This should update UI only and not invoke any syncronous backend operations
                            });
                        }
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ],
                { cancelable: true } // Optional: if the alert should be dismissible by tapping outside of it
            );
        } else {

            //console.log("thingRowPositionXs contents: " + JSON.stringify(thingRowPositionXs.current));
            const currentRowPositionX = thingRowPositionXs.current[index];
            const currentRowHeight = thingRowHeights.current[index]

            //console.log(`Stats of row before deleting - positionX ${JSON.stringify(currentRowPositionX)}, rowHeight ${JSON.stringify(currentRowHeight)}`);
            var animationArray = [
                Animated.timing(currentRowPositionX, {
                    toValue: -600,
                    duration: 300,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: false
                })
            ];

            // Only animate reduction of the height of the item if there are items underneath it
            if (index < (updatedThings.length - 1)) {
                animationArray.push(
                    Animated.timing(currentRowHeight, {
                        toValue: 0,
                        duration: 300,
                        easing: Easing.in(Easing.quad),
                        useNativeDriver: false
                    })
                );
            }
            Animated.parallel(animationArray).start(() => {
                //console.log(`Deleting sole item at index ${index}: ${updatedThings[index].text}`);

                amplitude.track(`${thingNameStr} Deleted`, {
                    anonymous_id: anonymousId,
                    thing_uuid: updatedThings[index].uuid,
                    thing_type: thingNameStr
                });

                // Call asyncronous delete to mark item as deleted in backend to sync database
                deleteThing(updatedThings[index].uuid);

                // Remove item from displayed and thingRowPositionXs lists
                updatedThings.splice(index, 1);
                thingRowPositionXs.current.splice(index, 1);
                thingRowHeights.current.splice(index, 1);

                //console.log(`updatedThings post delete (${updatedThings.length}): ${JSON.stringify(updatedThings)}`);

                if (updatedThings[index]) {
                    updatedThings[index].resetHeight = true           
                }
                currentRowPositionX.setValue(0);

                listArraySetter(updatedThings); // This should update UI only and not invoke any syncronous backend operations
               
            });
        }

        console.log(`Exiting handle delete ${thingNameStr.toLowerCase()} at index ${index}...`);
    }

    return (
        <Reanimated.View style={[styles.itemSwipeAction, styles.action_Delete]}>
            <Pressable
                onPress={() => handleThingDelete(listThingIndex)}>
                <Image style={styles.swipeActionIcon_trash} source={require("@/assets/images/trash_icon_white.png")} />
            </Pressable>
        </Reanimated.View>
    );
};

export default DootooSwipeAction_Delete;