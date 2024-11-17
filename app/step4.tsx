import DootooItemSidebar from '@/components/DootooItemSidebar';
import OnboardingFooter from '@/components/OnboardingFooter';
import OnboardingHeader from '@/components/OnboardingHeader';
import { useRouter } from 'expo-router';
import { Text, View, StyleSheet, Image } from 'react-native'
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as amplitude from '@amplitude/analytics-react-native';
import { useEffect } from 'react';

export default function Step4() {
    const router = useRouter();

    useEffect(() => {
        amplitude.track("Onboarding Step 4 Viewed");
    },[]);

    const onSwipe = ({ nativeEvent }) => {
        if (nativeEvent.state === State.END) {
            const { translationX } = nativeEvent;

            if (translationX < -50) {
                router.navigate('/step5');
            } else if (translationX > 50) {
                router.back();
            }
        }
    }

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#DCC7AA',
            justifyContent: 'center'
        },
        onboardingCopyContainer: {
            paddingLeft: 40,
            paddingRight: 40
        },
        centerCopy: {
            fontSize: 40,
            color: '#3E2723',
            marginBottom: 10
        },
        red: {
            color: '#A23E48'
        },
        green: {
            color: '#556B2F'
        },
        itemAndTipsContainer: {
            marginBottom: 50
        },
        itemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 20,
            paddingTop: 4
        },
        taskTitle: {
            fontSize: 16,
            textAlign: 'left',
            paddingBottom: 5,
            paddingTop: 5
        },
        subtaskFiller: {
            width: 20
        },
        itemCircleOpen: {
            width: 26,
            height: 26,
            borderRadius: 13, // Half of the width and height for a perfect circle
            borderColor: 'black',
            borderWidth: 2,
            backgroundColor: 'white',
            marginLeft: 15
        },
        headerItemNameContainer: {
            marginLeft: 15,
            paddingBottom: 10,
            paddingTop: 10,
            flex: 1,
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#3E272333'
        },
        headerTipNameContainer: {
            marginLeft: 25,
            paddingBottom: 10,
            paddingTop: 10,
            flex: 1,
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#3E272333'
        },
        itemNamePressable: {
            flex: 1,
            width: '100%'
        },
        similarCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            paddingLeft: 15
        },
        similarCountText: {
            fontSize: 15
        },
        similarCountIcon: {
            width: 16,
            height: 16,
            opacity: 0.45,
            marginLeft: 10
        },
        tipCountContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row'
        },
        tipCountText: {
            fontSize: 15
        },
        tipCountIcon: {
            width: 16,
            height: 16,
            borderRadius: 8, // Half of the width and height for a perfect circle
            borderColor: '#3E2723',
            backgroundColor: '#556B2F60',
            marginLeft: 10
        },
        tipsContainer: {
            backgroundColor: '#EBDDC5',
            paddingBottom: 25
        },
        scoreContainer: {
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexDirection: 'row',
            width: 80
        },
        scoreText: {
            fontSize: 16,
            paddingRight: 10
        },
        scoreIcon: {
            width: 16,
            height: 16,
            opacity: 0.5
        }
    });

    return (
        <PanGestureHandler onHandlerStateChange={onSwipe}>
            <View style={styles.container}>
                <OnboardingHeader />
                <View style={styles.itemAndTipsContainer}>
                    <View style={styles.itemContainer}>
                        <View style={styles.itemCircleOpen}></View>
                        <View style={styles.headerItemNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Go for a run</Text>
                            </View>
                            <DootooItemSidebar thing={{ tip_count: 3100, similar_count: 6200 }} styles={styles} />
                        </View>
                    </View>
                    <View style={styles.tipsContainer}>
                        <View style={styles.itemContainer}>
                            <View style={styles.headerTipNameContainer}>
                                <View style={styles.itemNamePressable}>
                                    <Text style={styles.taskTitle}>Take some shot blocks an hour before</Text>
                                </View>
                                <View style={styles.scoreContainer}>
                                    <Text style={styles.scoreText}>173</Text>
                                    <Image style={styles.scoreIcon} source={require("@/assets/images/thumbs_up_556B2F.png")} />
                                </View>
                            </View>
                        </View>
                        <View style={styles.itemContainer}>
                            <View style={styles.headerTipNameContainer}>
                                <View style={styles.itemNamePressable}>
                                    <Text style={styles.taskTitle}>Dress appropriately</Text>
                                </View>
                                <View style={styles.scoreContainer}>
                                    <Text style={styles.scoreText}>75</Text>
                                    <Image style={styles.scoreIcon} source={require("@/assets/images/thumbs_up_556B2F.png")} />
                                </View>
                            </View>
                        </View>
                        <View style={styles.itemContainer}>
                            <View style={styles.headerTipNameContainer}>
                                <View style={styles.itemNamePressable}>
                                    <Text style={styles.taskTitle}>Pick a scenic route for motivation</Text>
                                </View>
                                <View style={styles.scoreContainer}>
                                    <Text style={styles.scoreText}>66</Text>
                                    <Image style={styles.scoreIcon} source={require("@/assets/images/thumbs_up_556B2F.png")} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
                <View style={styles.onboardingCopyContainer}>
                    <Text style={styles.centerCopy}>get tips to <Text style={styles.green}>get things done</Text>.</Text>
                    <Text style={styles.centerCopy}>share tips to{'\n'}<Text style={styles.green}>give back</Text>.</Text>
                </View>
                <OnboardingFooter step={4} onForwardButtonPress={() => router.navigate('/step5')} />
            </View>
        </PanGestureHandler>
    );
}