import Svg, { Path } from "react-native-svg";

// https://tablericons.com/icon/clock-hour-2
export const Clock = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => (
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
        <Path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <Path d="M12 12l3 -2" />
        <Path d="M12 7v5" />
    </Svg>
)