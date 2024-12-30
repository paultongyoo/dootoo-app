import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Path, Circle } from "react-native-svg";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export const UsersRound = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => {

    const animatedProps = useAnimatedProps(() => {
        return {
            stroke: color.value
        }
    });

    return (
        <AnimatedSvg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity}
            strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
            animatedProps={animatedProps}>
            <Path d="M18 21a8 8 0 0 0-16 0" />
            <Circle cx="10" cy="8" r="5" />
            <Path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
        </AnimatedSvg>
    )
}