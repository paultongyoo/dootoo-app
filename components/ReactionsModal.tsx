import { View, StyleSheet, Pressable, Text, FlatList, Alert } from "react-native";
import Modal from "react-native-modal";
import { ThumbUp } from "./svg/thumb-up";
import { Heart } from "./svg/heart";
import { Laugh } from "./svg/laugh";
import { HandHeart } from "./svg/hand-heart";
import { PartyPopper } from "./svg/party-popper";
import * as Constants from './Constants';
import Animated, { Easing, runOnJS, useSharedValue, withTiming } from "react-native-reanimated";
import { useEffect } from "react";

const ReactionsModal = ({ modalVisible, modalVisibleSetter, reactions, reactionCounts }) => {

    const styles = StyleSheet.create({
        reactorsModal: {
            position: 'absolute',
            bottom: -20,                        // HACK: Depends on Footer Height!
            backgroundColor: '#FAF3E0',
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            width: '100%',
            height: '50%',
            padding: 20
        },
        reactorsModalHeader: {
            borderBottomWidth: 1,
            borderBottomColor: "#3E272333",
            marginBottom: 15
        },
        reactorsModalHeaderSections: {
            flexDirection: 'row'
        },
        reactorsModalHeaderSection: {
            flexDirection: 'row',
            paddingBottom: 10,
            paddingRight: 5,
            marginRight: 15,
            alignItems: 'center'
        },
        reactorsModalHeaderSectionText: {
            fontWeight: 'bold',
            fontSize: 16
        },
        reactorsModalHeaderSectionCount: {
            paddingLeft: 8
        },
        currentSectionIndicator: {    
            marginRight: 18,  // Keep these synced with sectionIcon padding
            width: 38,
            height: 4,
            backgroundColor: "#556b2f"
        }
    });

    useEffect(() => {
        animateCurrentSectionIndicator(-1);
    }, [reactionCounts])

    const updateReactionsFilter = (idx) => {
        //Alert.alert("Update reactions filter to idx: " + idx);
    }

    const barTranslateX = useSharedValue(0);
    const animateCurrentSectionIndicator = (reactionIndex) => {
        // 0 = First section
        // 1 = Second section
        // 2 = Third Section
        barTranslateX.value = withTiming((reactionIndex + 1) * 56, {
            duration: 150,
            easing: Easing.out(Easing.exp)
        }, (isFinished) => {
            if (isFinished) {
                runOnJS(updateReactionsFilter)(reactionIndex);
            }
        });
    }

    return (
        <Modal
            isVisible={modalVisible}
            onBackdropPress={() => { modalVisibleSetter(false) }}
            onSwipeComplete={() => { modalVisibleSetter(false) }}
            swipeDirection={"down"}
            backdropOpacity={0.3}
            animationIn={"slideInUp"}
            animationOut={"slideOutDown"}>
            <View style={styles.reactorsModal}>
                <View style={styles.reactorsModalHeader}>
                    <View style={styles.reactorsModalHeaderSections}>
                        {(Object.keys(reactionCounts).length > 1)
                            ? <>
                                <Pressable onPress={() => animateCurrentSectionIndicator(-1)}
                                            style={styles.reactorsModalHeaderSection}>
                                    <Text style={styles.reactorsModalHeaderSectionText}>All</Text>
                                    <Text style={[styles.reactorsModalHeaderSectionText, styles.reactorsModalHeaderSectionCount]}>{reactions.length}</Text>
                                </Pressable>
                                {Object.keys(reactionCounts).map((reaction, index) => (
                                    <View key={reaction}>
                                        <Pressable  onPress={() => animateCurrentSectionIndicator(index)}
                                                    style={styles.reactorsModalHeaderSection}>
                                            {(reaction == Constants.REACTION_LIKE) ? <ThumbUp wxh="20" color="#556B2F" />
                                                : (reaction == Constants.REACTION_LOVE) ? <Heart wxh="20" color="#556B2F" />
                                                    : (reaction == Constants.REACTION_LAUGH) ? <Laugh wxh="20" color="#556B2F" />
                                                        : (reaction == Constants.REACTION_SUPPORT) ? <HandHeart wxh="20" color="#556B2F" />
                                                            : <PartyPopper wxh="20" color="#556B2F" />
                                            }
                                            <Text style={[styles.reactorsModalHeaderSectionText, styles.reactorsModalHeaderSectionCount]}>{reactionCounts[reaction as string]}</Text>
                                        </Pressable>                                    
                                    </View>
                                ))}
                            </>
                            : <>
                                <View style={styles.reactorsModalHeaderSection}>
                                    {(Object.keys(reactionCounts)[0] == Constants.REACTION_LIKE) ? <ThumbUp wxh="20" color="#556B2F" />
                                        : (Object.keys(reactionCounts)[0] == Constants.REACTION_LOVE) ? <Heart wxh="20" color="#556B2F" />
                                            : (Object.keys(reactionCounts)[0] == Constants.REACTION_LAUGH) ? <Laugh wxh="20" color="#556B2F" />
                                                : (Object.keys(reactionCounts)[0] == Constants.REACTION_SUPPORT) ? <HandHeart wxh="20" color="#556B2F" />
                                                    : <PartyPopper wxh="20" color="#556B2F" />
                                    }
                                    <Text style={[styles.reactorsModalHeaderSectionText, styles.reactorsModalHeaderSectionCount]}>{reactionCounts[Object.keys(reactionCounts)[0]] as string}</Text>
                                </View>
                            </>
                        }
                    </View>
                    <Animated.View style={[styles.currentSectionIndicator, { transform: [{ translateX: barTranslateX }] }]}></Animated.View>
                </View>
                <FlatList data={reactions}
                    renderItem={({ item, index, separators }) =>
                        <Text>{item.reaction.name}: {item.user.name}</Text>
                    }
                    keyExtractor={(item, index) => `${item.user.name}_${item.reaction.name}`} />
            </View>
        </Modal>
    )
}

export default ReactionsModal;