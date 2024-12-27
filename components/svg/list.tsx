import Animated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

// https://lucide.dev/icons/list
export const List = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => {

    const animatedProps = useAnimatedProps(() => {
        
        //console.log("List Color Value: " + color.value);

        return {
             stroke: color.value
        }
    });

    return (
        <AnimatedSvg width={wxh} height={wxh} viewBox="0 0 24 24"
            fill="none" strokeWidth={strokeWidth} opacity={opacity}
            strokeLinecap="round" strokeLinejoin="round" animatedProps={animatedProps}>
            <Path d="M3 12h.01" />
            <Path d="M3 18h.01" />
            <Path d="M3 6h.01" />
            <Path d="M8 12h13" />
            <Path d="M8 18h13" />
            <Path d="M8 6h13" />
        </AnimatedSvg>
    )
} 