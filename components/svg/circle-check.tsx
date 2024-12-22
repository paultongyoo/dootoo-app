import Svg, { Circle, Path } from "react-native-svg";

export const CircleCheck = ({wxh, color, opacity="1.0", strokeWidth="2"}) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" 
         fill="none" opacity={opacity}
         stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10"/>
        <Path d="m9 12 2 2 4-4"/>
    </Svg>
)