import Svg, { Circle } from "react-native-svg";

// https://lucide.dev/icons/ellipsis-vertical
export const EllipsisVertical = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity}
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="1" />
        <Circle cx="12" cy="5" r="1" />
        <Circle cx="12" cy="19" r="1" />
    </Svg>
)