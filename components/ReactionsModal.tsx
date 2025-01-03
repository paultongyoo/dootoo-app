import { View, StyleSheet, Pressable, Text, FlatList } from "react-native";
import Modal from "react-native-modal";
import { ThumbUp } from "./svg/thumb-up";
import { Heart } from "./svg/heart";
import { Laugh } from "./svg/laugh";
import { HandHeart } from "./svg/hand-heart";
import { PartyPopper } from "./svg/party-popper";
import * as Constants from './Constants';

const ReactionsModal = ({modalVisible, modalVisibleSetter, reactions, reactionCounts}) => {

    const styles = StyleSheet.create({
        reactorsModal: {
            position: 'absolute',
            bottom: -20,                        // HACK: Depends on Footer Height!
            backgroundColor: '#FAF3E0',
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            width: '100%',
            height: '50%',
            padding: 10
        },
        reactorsModalHeader: {

        },
        reactorsModalHeaderSection: {

        }
    })

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
                    { (Object.keys(reactionCounts).length > 1) 
                            ? <>
                                <Pressable style={styles.reactorsModalHeaderSection}>
                                    <Text>All</Text>
                                </Pressable>
                                {Object.keys(reactionCounts).map(reaction  => (
                                    <View key={reaction}>
                                        <Pressable style={styles.reactorsModalHeaderSection}>
                                            {(reaction == Constants.REACTION_LIKE) ? <ThumbUp wxh="20" color="#556B2F" />
                                                : (reaction == Constants.REACTION_LOVE) ? <Heart wxh="20" color="#556B2F" />
                                                    : (reaction == Constants.REACTION_LAUGH) ? <Laugh wxh="20" color="#556B2F" />
                                                        : (reaction == Constants.REACTION_SUPPORT) ? <HandHeart wxh="20" color="#556B2F" />
                                                            : <PartyPopper wxh="20" color="#556B2F" />
                                            }
                                        </Pressable>
                                        <Text>{reactionCounts[reaction as string]}</Text>
                                    </View>
                                ))}
                              </>
                            :                                     <>
                            <Pressable style={styles.reactorsModalHeaderSection}>
                                {(Object.keys(reactionCounts)[0] == Constants.REACTION_LIKE) ? <ThumbUp wxh="20" color="#556B2F" />
                                    : (Object.keys(reactionCounts)[0] == Constants.REACTION_LOVE) ? <Heart wxh="20" color="#556B2F" />
                                        : (Object.keys(reactionCounts)[0] == Constants.REACTION_LAUGH) ? <Laugh wxh="20" color="#556B2F" />
                                            : (Object.keys(reactionCounts)[0] == Constants.REACTION_SUPPORT) ? <HandHeart wxh="20" color="#556B2F" />
                                                : <PartyPopper wxh="20" color="#556B2F" />
                                }
                            </Pressable>
                            <Text>{reactionCounts[Object.keys(reactionCounts)[0]] as string}</Text>
                        </>
                    }
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