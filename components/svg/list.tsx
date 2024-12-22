import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/list
export const List = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24"
        fill="none" stroke={color} strokeWidth={strokeWidth} opacity={opacity}
        strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 12h.01" />
        <Path d="M3 18h.01" />
        <Path d="M3 6h.01" />
        <Path d="M8 12h13" />
        <Path d="M8 18h13" />
        <Path d="M8 6h13" />
    </Svg>
)