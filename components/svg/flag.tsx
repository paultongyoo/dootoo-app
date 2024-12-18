import Svg, { Line, Path } from "react-native-svg";

// https://lucide.dev/icons/flag
export const Flag = ({wxh, color, opacity = "1.0", strokeWidth = "2"}) => (
    <Svg width={wxh} height={wxh} opacity={opacity} viewBox="0 0 24 24" fill="none" 
         stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path fill={color} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <Line x1="4" x2="4" y1="22" y2="15"/>
    </Svg>
)