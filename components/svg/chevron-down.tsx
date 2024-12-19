import Svg, { Path } from "react-native-svg";

export const ChevronDown = ({wxh, color, opacity="1.0", strokeWidth="2"}) => (
<Svg width={wxh} height={wxh} viewBox="0 0 24 24" opacity={opacity} fill="none" 
     stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m6 9 6 6 6-6"/>
</Svg>
)