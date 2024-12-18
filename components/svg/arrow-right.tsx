import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/arrow-right
export const ArrowRight = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity}
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12h14" />
        <Path d="m12 5 7 7-7 7" />
    </Svg>
)