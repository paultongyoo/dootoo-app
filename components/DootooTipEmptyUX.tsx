import { Animated, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRef, useCallback, useState, useContext } from 'react';
import { useFocusEffect } from 'expo-router';
import { generateTipCTA } from './BackendServices';
import { AppContext } from './AppContext';

const DootooTipEmptyUX = ({ selectedItem, tipArray }) => {
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

    const emptyStyles = StyleSheet.create({
        emptyListContainer: {
          flex: 1,
          justifyContent: 'center',
          paddingLeft: 30,
          paddingRight: 60          
        },
        emptyListContainer_words: {
          fontSize: 40,
          lineHeight: 48            
        },
        initialLoadAnimContainer: {     // TODO: Remove this redundant loading animation
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
          },
      })


    return (
        <>
            {(ctaLoading) ?

                // TODO: Remove this redundant loading animation
                <Animated.View style={[emptyStyles.initialLoadAnimContainer, { opacity: emptyListCTAOpacity }]}>
                    <ActivityIndicator size={"large"} color="#3E3723" />
                </Animated.View>
                :
                <Animated.View style={[emptyStyles.emptyListContainer, {opacity: emptyListCTAOpacity }]}>
                {/* <Animated.View style={[styles.emptyListContainer, {opacity: emptyListCTAOpacity }, !ctaLoading && {opacity: fadeCTA}]}> */}
                    <Text style={emptyStyles.emptyListContainer_words}>{emptyListCTA}</Text>
                    {/* <Image style={styles.emptyListContainer_arrow} source={require("@/assets/images/sketch_arrow_556B2F.png")} /> */}
                </Animated.View>
            }
        </>
    );
}

export default DootooTipEmptyUX;