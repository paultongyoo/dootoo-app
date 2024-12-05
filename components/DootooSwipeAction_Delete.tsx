import { Pressable, Image, Alert, Animated, Easing } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { AppContext } from './AppContext';
import { useContext } from 'react';
import * as amplitude from '@amplitude/analytics-react-native';

const DootooSwipeAction_Delete = ({
    styles, listArray, listArraySetter, listThing,
    deleteThing, thingNameStr = "Item" }) => {
    const { anonymousId, thingRowPositionXs, thingRowHeights } = useContext(AppContext);

    const handleThingDelete = (thing: any) => {
        //console.log("Entering handle delete item...");
        const listArrayCopy = listArray.map((obj) => ({ ...obj }));

        // If the thing is a parent and has one or more children, ask user if they want to remove all children too
        const thingSubtasks = listArrayCopy.filter((obj) => obj.parent_item_uuid == thing.uuid);

        if (!listThing.parent_item_uuid && (thingSubtasks.length > 0)) {

            Alert.alert(
                `${thingNameStr} Has ${thingSubtasks.length} Sub${thingNameStr.toLowerCase()}${thingSubtasks.length > 1 ? 's' : ''}`,
                `Deleting this ${thingNameStr.toLowerCase()} will delete its sub${thingNameStr.toLowerCase()}${thingSubtasks.length > 1 ? 's' : ''} too.  Continue?`,
                [
                    {
                        text: 'Yes',
                        onPress: () => {

                            // Three step process:
                            // 1) Animate away the item and its subitems
                            // 2) Delete each item from backend
                            // 3) Remove each item from UI array
                            var slideAnimationArray = [];
                            var heightAnimationArray = [];
                            const index = listArrayCopy.findIndex(obj => obj.uuid == thing.uuid);
                            for (var i = index; i <= index + thingSubtasks.length; i++) {

                                // Call asyncronous delete to mark item as deleted in backend to sync database
                                deleteThing(listArrayCopy[i].uuid);

                                amplitude.track(`${thingNameStr} Deleted`, {
                                    anonymous_id: anonymousId.current,
                                    thing_uuid: listArrayCopy[i].uuid,
                                    thing_type: thingNameStr
                                });

                                // Add the animation to slide the item off the screen
                                slideAnimationArray.push(
                                    Animated.timing(thingRowPositionXs.current[listArrayCopy[i].uuid], {
                                        toValue: -600,
                                        duration: 300,
                                        easing: Easing.in(Easing.quad),
                                        useNativeDriver: false
                                    })
                                );

                                if (i < (listArrayCopy.length - 1)) {
                                    heightAnimationArray.push(
                                        Animated.timing(thingRowHeights.current[listArrayCopy[i].uuid], {
                                            toValue: 0,
                                            duration: 300,
                                            easing: Easing.in(Easing.quad),
                                            useNativeDriver: false
                                        })
                                    );
                                }
                            }
                            Animated.parallel(slideAnimationArray).start(() => {
                                Animated.parallel(heightAnimationArray).start(() => {

                                    // v1.1.1 Deprecate
                                    //listArrayCopy.splice(index, 1 + thingSubtasks.length);  // Remove item and its subtasks from array
                                    
                                    delete thingRowPositionXs.current[thing.uuid];
                                    delete thingRowHeights.current[thing.uuid];                        
                                    for (const subtask in thingSubtasks) {
                                        delete thingRowPositionXs.current[subtask.uuid];
                                        delete thingRowHeights.current[subtask.uuid]
                                    }

                                    // v1.1.1 Deprecate
                                    //listArraySetter(updatedThings); // This should update UI only and not invoke any syncronous backend operations   
                                    
                                    const subtaskUUIDSet = new Set(thingSubtasks.map(obj => obj.uuid));   
                                    listArraySetter((prevThings) => prevThings.filter((obj) => (obj.uuid != thing.uuid) && !subtaskUUIDSet.has(obj.uuid)));                            
                                })
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
            const currentRowPositionX = thingRowPositionXs.current[thing.uuid];
            const currentRowHeight = thingRowHeights.current[thing.uuid]

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
            const index = listArrayCopy.findIndex(obj => obj.uuid == thing.uuid);
            if (index < (listArrayCopy.length - 1)) {
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
                    anonymous_id: anonymousId.current,
                    thing_uuid: thing.uuid,
                    thing_type: thingNameStr
                });

                // Call asyncronous delete to mark item as deleted in backend to sync database
                deleteThing(thing.uuid);

                // Remove item from displayed and thingRowPositionXs lists
                listArrayCopy.splice(index, 1);
                delete thingRowPositionXs.current[thing.uuid];
                delete thingRowHeights.current[thing.uuid];

                //console.log(`updatedThings post delete (${updatedThings.length}): ${JSON.stringify(updatedThings)}`);

                //listArraySetter(updatedThings); // This should update UI only and not invoke any syncronous backend operations
                listArraySetter((prevThings) => prevThings.filter((obj) => (obj.uuid != thing.uuid)));                            
            });
        }

       //console.log(`Exiting handle delete ${thingNameStr.toLowerCase()} at index ${index}...`);
    }

    return (
        <Reanimated.View style={[styles.itemSwipeAction, styles.action_Delete]}>
            <Pressable
                onPress={() => handleThingDelete(listThing)}>
                <Image style={styles.swipeActionIcon_trash} source={require("@/assets/images/trash_icon_white.png")} />
            </Pressable>
        </Reanimated.View>
    );
};

export default DootooSwipeAction_Delete;