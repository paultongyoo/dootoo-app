import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/undo-2
export const Undo = ({wxh, color, opacity="1.0", strokeWidth="2"}) => (
    <Svg width={wxh} height={wxh} opacity={opacity} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} 
         strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 14 4 9l5-5"/>
        <Path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>
    </Svg>
)