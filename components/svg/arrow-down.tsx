import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/arrow-down
export const ArrowDown = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" stroke={color} opacity={opacity}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 5v14" />
        <Path d="m19 12-7 7-7-7" />
    </Svg>
)