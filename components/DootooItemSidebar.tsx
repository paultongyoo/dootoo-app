import { View, Text, Image, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';

const DootooItemSidebar = ({ thing, styles }) => {

    const formatNumber = (num) => {
        if (num < 1000) return num.toString();
        if (num < 1_000_000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num < 1_000_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
        return (num / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
      }

    if (thing.counts_updating) {
        return (
            <View style={styles.itemCountsRefreshingAnimContainer}>
                <ActivityIndicator size={"small"} color="black" />
            </View>
        );
    } else {
        return (
            <> 
                {(thing.tip_count || thing.is_done) ?
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