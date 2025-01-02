import Svg, { Circle, Path, Line } from "react-native-svg";

// https://lucide.dev/icons/laugh
export const Laugh = ({ wxh, color, opacity = "1.0", strokeWidth = "2", fill = "none" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" opacity={opacity} fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z" />
        <Line x1="9" x2="9.01" y1="9" y2="9" />
        <Line x1="15" x2="15.01" y1="9" y2="9" />
    </Svg>
)