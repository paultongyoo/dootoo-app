import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

// https://lucide.dev/icons/user-round
export const UserRound = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => {

    const animatedProps = useAnimatedProps(() => {
        
        //console.log("User Round Color Value: " + color.value);

        return {
             stroke: color.value
        }
    });

    return (
        <AnimatedSvg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity}
            strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" animatedProps={animatedProps}>
            <Circle cx="12" cy="8" r="5" />
            <Path d="M20 21a8 8 0 0 0-16 0" />
        </AnimatedSvg>
    )
}