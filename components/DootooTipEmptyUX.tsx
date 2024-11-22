import { Animated, Text, Image, View, ActivityIndicator } from 'react-native';
import { useRef, useCallback, useState, useContext } from 'react';
import { useFocusEffect } from 'expo-router';
import { generateTipCTA } from './BackendServices';
import { AppContext } from './AppContext';

const DootooTipEmptyUX = ({ styles, selectedItem, tipArray }) => {
    const { anonymousId, emptyListCTAOpacity, emptyListCTAFadeInAnimation, tips  } = useContext(AppContext);
    const [ctaLoading, setCTALoading] = useState(true);
    const [emptyListCTA, setEmptyListCTA] = useState('');
    const fadeCTA = useRef(new Animated.Value(0)).current;
    const ctaAnimation = Animated.timing(fadeCTA, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
    });

    const generateEmptyListCTA = async () => {
        const emptyListCTA = await generateTipCTA(anonymousId, selectedItem.uuid)
        //console.log("Setting empty tip list CTA to: " + emptyListCTA);
        setEmptyListCTA(emptyListCTA);
        setCTALoading(false);
        ctaAnimation.start();
    }

    useFocusEffect(
        useCallback(() => {
            emptyListCTAFadeInAnimation.start(() => {
                if (tipArray.length == 0) {
                    generateEmptyListCTA();
                } else {
                    //console.log(`Unexpected scenario:  Inside Empty List useEffect but passed a non-empty Tip Array!  Fix me?`)
                }
            });
            return () => {
                //console.log("Inside return callback form TipEmptyUX.useFocusEffect([])");
                // emptyListCTAFadeInAnimation.reset();
                // ctaAnimation.reset();
            }
        }, [])
    );


    return (
        <>
            {(ctaLoading) ?
                <Animated.View style={[styles.initialLoadAnimContainer, { opacity: emptyListCTAOpacity }]}>
                    <ActivityIndicator size={"large"} color="#3E3723" />
                </Animated.View>
                :
                <Animated.View style={[styles.emptyListContainer, {opacity: emptyListCTAOpacity }]}>
                {/* <Animated.View style={[styles.emptyListContainer, {opacity: emptyListCTAOpacity }, !ctaLoading && {opacity: fadeCTA}]}> */}
                    <Text style={styles.emptyListContainer_words}>{emptyListCTA}</Text>
                    <Image style={styles.emptyListContainer_arrow} source={require("@/assets/images/sketch_arrow_556B2F.png")} />
                </Animated.View>
            }
        </>
    );
}

export default DootooTipEmptyUX;