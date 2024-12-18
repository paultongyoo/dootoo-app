import Svg, { Path } from "react-native-svg";

// https://tablericons.com/icon/bulb
export const Bulb = ({ wxh, color, opacity = "1", strokeWidth = "2" }) => (
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
        <Path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" />
        <Path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" />
        <Path d="M9.7 17l4.6 0" />
    </Svg>
)