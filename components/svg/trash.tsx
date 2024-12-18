import Svg, { Path, Line } from "react-native-svg";

// https://lucide.dev/icons/trash-2
export const Trash = ({wxh, color, opacity="1.0", strokeWidth="2"}) => (
<Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" 
     stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18"/>
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    <Line x1="10" x2="10" y1="11" y2="17"/>
    <Line x1="14" x2="14" y1="11" y2="17"/>
</Svg>
)