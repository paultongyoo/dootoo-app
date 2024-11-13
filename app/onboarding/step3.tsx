import DootooItemSidebar from '@/components/DootooItemSidebar';
import OnboardingFooter from '@/components/OnboardingFooter';
import OnboardingHeader from '@/components/OnboardingHeader';
import { useRouter } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native'
import { PanGestureHandler, State } from 'react-native-gesture-handler';

export default function Step3() {
    const router = useRouter();

    const onSwipe = ({ nativeEvent }) => {
        if (nativeEvent.state === State.END) {
            const { translationX } = nativeEvent;

            if (translationX < -50) {
                router.navigate('/onboarding/step4');
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
            color: '#3E2723'
        },
        red: {
            color: '#A23E48'
        },
        green: {
            color: '#556B2F'
        },
        itemsContainer: {
            position: 'relative',
            marginBottom: 70
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
        countDisclaimer: {
            fontSize: 14,
            fontStyle: 'italic',
            color: '#3E272399',
            position: 'absolute',
            right: 20,
            bottom: -30
        }
    });

    return (
        <PanGestureHandler onHandlerStateChange={onSwipe}>
            <View style={styles.container}>
                <OnboardingHeader />
                <View style={styles.itemsContainer}>
                    <View style={styles.itemContainer}>
                        <View style={styles.itemCircleOpen}></View>
                        <View style={styles.headerItemNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Drop off kid at school</Text>
                            </View>
                            <DootooItemSidebar thing={{tip_count: 127, similar_count: 251}} styles={styles} />
                        </View>
                    </View>
                    <View style={styles.itemContainer}>
                        <View style={styles.itemCircleOpen}></View>
                        <View style={styles.headerItemNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Go for a run</Text>
                            </View>
                            <DootooItemSidebar thing={{tip_count: 3300, similar_count: 6200}} styles={styles} />
                        </View>
                    </View>
                    <View style={styles.itemContainer}>
                        <View style={styles.itemCircleOpen}></View>
                        <View style={styles.headerItemNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Resume job search</Text>
                            </View>
                            <DootooItemSidebar thing={{tip_count: 23, similar_count: 503}} styles={styles} />
                        </View>
                    </View>
                    <View style={styles.itemContainer}>
                        <View style={styles.subtaskFiller}></View>
                        <View style={styles.itemCircleOpen}></View>
                        <View style={styles.headerItemNameContainer}>
                            <View style={styles.itemNamePressable}>
                                <Text style={styles.taskTitle}>Update resume</Text>
                            </View>
                            <DootooItemSidebar thing={{tip_count: 201, similar_count: 1500}} styles={styles} />
                        </View>
                    </View>
                    <Text style={styles.countDisclaimer}>*actual numbers vary</Text>
                </View>
                <View style={styles.onboardingCopyContainer}>
                    <Text style={styles.centerCopy}>see which things were <Text style={styles.green}>done by the community</Text>.</Text>
                </View>
                <OnboardingFooter step={3} onForwardButtonPress={() => router.navigate('/onboarding/step4')} />
            </View>
        </PanGestureHandler>
    );
}