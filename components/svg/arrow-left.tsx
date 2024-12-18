import Svg, { Path } from "react-native-svg";

// Source: https://lucide.dev/icons/arrow-left
// Chagning stroke-width appears to have no effect
export const ArrowLeft = ({ wxh, color, strokeWidth }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} stroke-linecap="round" stroke-linejoin="round">
        <Path d="m12 19-7-7 7-7" />
        <Path d="M19 12H5" />
    </Svg>
)