import { Animated, Text, Image, View, ActivityIndicator } from 'react-native';
import { useRef, useCallback, useState, useContext } from 'react';
import { useFocusEffect } from 'expo-router';
import { generateTipCTA } from './BackendServices';
import { AppContext } from './AppContext';

const DootooTipEmptyUX = ({ styles, ThingToDriveEmptyListCTA }) => {
    const { anonymousId } = useContext(AppContext);
    const [ctaLoading, setCTALoading] = useState(false);
    const [emptyListCTA, setEmptyListCTA] = useState('');
    const fadeCTA = useRef(new Animated.Value(0)).current;
    const ctaAnimation = Animated.timing(fadeCTA, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
    });

    const generateEmptyListCTA = async (thing) => {
        ctaAnimation.reset();
        //console.log("Calling generateTipCTA for thing: " + JSON.stringify(thing));
        setCTALoading(true);
        const emptyListCTA = await generateTipCTA(anonymousId, thing.uuid)
        //console.log("Setting emptyListCTA to: " + JSON.stringify(emptyListCTA));
        setEmptyListCTA(emptyListCTA);
        setCTALoading(false);
        ctaAnimation.start();
    }

    useFocusEffect(
        useCallback(() => {
            if (!ThingToDriveEmptyListCTA.tip_count || ThingToDriveEmptyListCTA == 0) {
                generateEmptyListCTA(ThingToDriveEmptyListCTA);
            }
            return () => {
                ctaAnimation.reset();
            }
        }, [])
    );


    return (
        <>
            {(ctaLoading) ?
                <View style={styles.initialLoadAnimContainer}>
                    <ActivityIndicator size={"large"} color="black" />
                </View>
                :
                <Animated.View style={[styles.emptyListContainer, { opacity: fadeCTA }]}>
                    <Text style={styles.emptyListContainer_words}>{emptyListCTA}</Text>
                    <Image style={styles.emptyListContainer_arrow} source={require("@/assets/images/sketch_arrow_556B2F.png")} />
                </Animated.View>
            }
        </>
    );
}

export default DootooTipEmptyUX;