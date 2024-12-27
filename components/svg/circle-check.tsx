import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export const CircleCheck = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => {

    const animatedProps = useAnimatedProps(() => {
        
        //console.log("Circle Check Value: " + color.value);

        return {
             stroke: color.value
        }
    });

    return (
        <AnimatedSvg width={wxh} height={wxh} viewBox="0 0 24 24"
            fill="none" opacity={opacity} animatedProps={animatedProps}
            strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Path d="m9 12 2 2 4-4" />
        </AnimatedSvg>
    )
}