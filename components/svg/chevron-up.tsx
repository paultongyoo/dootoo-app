import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/chevron-up
export const ChevronUp = ({wxh, color, opacity="1.0", strokeWidth="2"}) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" stroke={color} 
        strokeWidth={strokeWidth} opacity={opacity} strokeLinecap="round" strokeLinejoin="round">
        <Path d="m18 15-6-6-6 6"/>
    </Svg>
)