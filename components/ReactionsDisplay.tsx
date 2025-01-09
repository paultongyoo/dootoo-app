import { Pressable, View, StyleSheet, Text } from "react-native"
import { HandHeart } from "./svg/hand-heart"
import { Heart } from "./svg/heart"
import { Laugh } from "./svg/laugh"
import { ThumbUp } from "./svg/thumb-up"
import { PartyPopper } from "./svg/party-popper"
import * as Constants from "@/components/Constants";


export const ReactionsDisplay = ({ reactions, onReactionsPress }) => {
    const styles = StyleSheet.create({
        reactions: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 4
        },
        reaction: {
            paddingRight: 5
        },
        reactionCount: {
            fontWeight: 'bold',
            color: '#556b2F',
            fontSize: 16,
            paddingLeft: 5
        }
    })

    return (
        <>
            {(reactions.length > 0) ?
                <Pressable style={({ pressed }) => [{alignSelf: 'flex-start'}, pressed && { backgroundColor: '#3e272310' }]}
                    onPress={onReactionsPress}>
                    <View style={styles.reactions}>
                        {[...new Set(reactions.map((ur) => ur.reaction.name))].map(reaction_name => (
                            (reaction_name == Constants.REACTION_LIKE) ? <View key={reaction_name} style={styles.reaction}><ThumbUp wxh="20" color="#556B2F" /></View>
                                : (reaction_name == Constants.REACTION_LOVE) ? <View key={reaction_name} style={styles.reaction}><Heart wxh="20" color="#556B2F" /></View>
                                    : (reaction_name == Constants.REACTION_LAUGH) ? <View key={reaction_name} style={styles.reaction}><Laugh wxh="20" color="#556B2F" /></View>
                                        : (reaction_name == Constants.REACTION_SUPPORT) ? <View key={reaction_name} style={styles.reaction}><HandHeart wxh="20" color="#556B2F" /></View>
                                            : <View key={reaction_name} style={styles.reaction}><PartyPopper wxh="20" color="#556B2F" /></View>
                        ))}
                        <Text style={styles.reactionCount}>{reactions.length}</Text>
                    </View>
                </Pressable>
                : <></>}
        </>
    )
}