import { loadCommunityItems } from "@/components/Storage";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ActivityIndicator, FlatList, Text } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const CommunityScreen = () => {

    const [screenInitialized, setScreenInitialized] = useState(false);
    const initialLoadFadeInOpacity = useSharedValue(0);
    const initialLoadAnimatedOpacity = useAnimatedStyle(() => {
        return { opacity: initialLoadFadeInOpacity.value }
    })
    const [communityItems, setCommunityItems] = useState(null);
    const [page, setPage] = useState(1);
    const hasMoreItems = useRef(false);

    useEffect(() => {  
        const initializeCommunityScreen = async() => {
            await new Promise<void>((resolve) => 
                initialLoadFadeInOpacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
                    if (isFinished) {
                        runOnJS(resolve)();
                    }
                }));
            
            const responseObj = await loadCommunityItems(page);
            hasMoreItems.current = responseObj.hasMore;
            console.log("Community Items: " + JSON.stringify(responseObj.items));
            setCommunityItems([...responseObj.items])
        }
        initializeCommunityScreen();
    }, []);
    

    const styles = StyleSheet.create({
        container: {
            backgroundColor: '#DCC7AA',
            flex: 1
        },
        initialLoadAnimContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        },
    })
    return (
        <View style={styles.container}>
            {(!communityItems) ?
                <Animated.View style={[styles.initialLoadAnimContainer, initialLoadAnimatedOpacity]}>
                    <ActivityIndicator size={"large"} color="#3E3723" />
                </Animated.View>
                :       <FlatList data={communityItems}
                            renderItem={({item}) => <Text>{item.text}</Text> }
                            keyExtractor={item => `${item.user.name}_${item.text}`} />
            }
        </View>
    )
}

export default CommunityScreen;