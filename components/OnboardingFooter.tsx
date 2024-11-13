import { Platform, StyleSheet, View, Pressable, Image, Alert} from 'react-native';

const OnboardingFooter = ({step = 1, onForwardButtonPress = () => {Alert.alert('Implement Me')}}) => {

    const styles = StyleSheet.create({
        onboardingFooterContainer: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'absolute',
          bottom: 70,
          left: 0,
          right: 0
        },
        stepCircle: {
            height: 20,
            width: 20,
            borderRadius: 10,
            backgroundColor: '#FAF3E0',
            marginRight: 7
        },
        stepCurrent: {
            backgroundColor: '#556B2F'
        },
        forwardButtonContainer: {
            position: 'absolute',
            right: 30
        },
        forwardButtonIcon: {
            height: 40,
            width: 40
        }
    });

    return (
        <View style={styles.onboardingFooterContainer}>
            <View style={[styles.stepCircle, (step == 1) && styles.stepCurrent]}></View>
            <View style={[styles.stepCircle, (step == 2) && styles.stepCurrent]}></View>
            <View style={[styles.stepCircle, (step == 3) && styles.stepCurrent]}></View>
            <View style={[styles.stepCircle, (step == 4) && styles.stepCurrent]}></View>
            <View style={[styles.stepCircle, (step == 5) && styles.stepCurrent]}></View>
            <Pressable style={styles.forwardButtonContainer} onPress={onForwardButtonPress}>
                { (Platform.OS == 'ios') ?
                    <Image style={styles.forwardButtonIcon} source={require('@/assets/images/forward_arrow_556B2F_ios.png')} />
                    : <Image style={styles.forwardButtonIcon} source={require('@/assets/images/forward_arrow_556B2F_android.png')} />
                }
            </Pressable>
        </View>
    );
}

export default OnboardingFooter;