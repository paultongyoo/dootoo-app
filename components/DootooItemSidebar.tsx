import { View, Text, Image, ActivityIndicator } from 'react-native';
import { formatNumber } from './Helpers';

const DootooItemSidebar = ({ thing, styles }) => {

    if (thing.counts_updating) {
        return (
            <View style={styles.itemCountsRefreshingAnimContainer}>
                <ActivityIndicator size={"small"} color="black" />
            </View>
        );
    } else {
        return (
            <> 
                {(thing.tip_count > 0) ?
                    <View style={styles.tipCountContainer}>
                        <Text style={styles.tipCountText}>{formatNumber(thing.tip_count) || '0'}</Text>
                        <View style={styles.tipCountIcon}></View>
                    </View> : <></>}
                {(thing.similar_count && thing.similar_count > 0) ?
                    <View style={styles.similarCountContainer}>
                        <Text style={styles.similarCountText}>{formatNumber(thing.similar_count)}</Text>
                        <Image style={styles.similarCountIcon} source={require("@/assets/images/person_icon_556B2F.png")} />
                    </View> : <></>}
            </>
        );
    }
};

export default DootooItemSidebar;