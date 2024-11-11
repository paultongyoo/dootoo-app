import { View, Text, Image } from 'react-native';
import { useEffect } from 'react';

const DootooItemSidebar = ({ thing, styles }) => {

    useEffect(() => {
        console.log("Inside Sidebar useEffect - thing contents: " + JSON.stringify(thing));
        console.log("thing up_vote check: " + JSON.stringify(thing.upvote_count));
    });

    return (
        <>
            {(thing.tip_count || thing.is_done) ?
                <View style={styles.tipCountContainer}>
                    <Text style={styles.tipCountText}>{thing.tip_count}</Text>
                    <View style={styles.tipCountIcon}></View>
                </View> : <></>}
            {(thing.similar_count && thing.similar_count > 0) ?
                <View style={styles.similarCountContainer}>
                    <Text style={styles.similarCountText}>{thing.similar_count}</Text>
                    <Image style={styles.similarCountIcon} source={require("../assets/images/person_icon_556B2F.png")} />
                </View> : <></>}
        </>
    )
};

export default DootooItemSidebar;