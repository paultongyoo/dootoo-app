import { View, Text, Image } from 'react-native';

const DootooItemSidebar = ({ thing, styles }) => {

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