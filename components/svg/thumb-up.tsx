import Svg, { Path } from "react-native-svg";

// https://tablericons.com/icon/thumb-up
export const ThumbUp = ({ wxh, color, opacity = "1.0", strokeWidth = "2", fill="none" }) => (
    <Svg
        width={wxh}
        height={wxh}
        viewBox="0 0 24 24"
        fill="none"
        opacity={opacity}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <Path fill={fill} d="M7 11v8a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1h3a4 4 0 0 0 4 -4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1 -2 2h-7a3 3 0 0 1 -3 -3" />
    </Svg>
)