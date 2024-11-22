import { View, Text, Image, ActivityIndicator, Pressable } from 'react-native';
import { formatNumber } from './Helpers';
import Toast from 'react-native-toast-message';
import { useContext } from 'react';
import { AppContext } from './AppContext';
import { useRouter } from 'expo-router';

const DootooItemSidebar = ({ thing, styles }) => {
    const router = useRouter();
    const { setSelectedItem } = useContext(AppContext);
    const TIPS_PATHNAME = '/meDrawer/communityDrawer/stack/tips';

    const handleSimilarCountTap = (count) => {
        Toast.show({
            type: 'msgOnlyToast',
            text1: `${count} ${(count > 1) ? 'people' : 'person'} had similar`,
            position: 'bottom',
            bottomOffset: 220,
            props: {
                width: 190
            }
        });
    }

    const handleTipCountTap = () => {
        setSelectedItem(thing);
        router.push(TIPS_PATHNAME);
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
                {(thing.tip_count > 0) ?
                    <Pressable style={styles.tipCountContainer}
                    onPress={() => handleTipCountTap()}>
                        <Text style={styles.tipCountText}>{formatNumber(thing.tip_count) || '0'}</Text>
                        <View style={styles.tipCountIcon}></View>
                    </Pressable> : <></>}
                {(thing.similar_count && thing.similar_count > 0) ?
                    <Pressable style={styles.similarCountContainer}
                               onPress={() => handleSimilarCountTap(thing.similar_count)}>
                        <Text style={styles.similarCountText}>{formatNumber(thing.similar_count)}</Text>
                        <Image style={styles.similarCountIcon} source={require("@/assets/images/person_icon_556B2F.png")} />
                    </Pressable> : <></>}
            </>
        );
    }
};

export default DootooItemSidebar;