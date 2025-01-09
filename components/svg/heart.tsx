import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/heart
export const Heart = ({ wxh, color, opacity = "1.0", strokeWidth = "2", fill = "none" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" opacity={opacity} fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Svg>
)