import Svg, { Path } from "react-native-svg"

// https://tablericons.com/icon/indent-decrease
export const IndentDecrease = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => (
    <Svg
        width={wxh}
        height={wxh}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        opacity={opacity}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <Path d="M20 6l-7 0" />
        <Path d="M20 12l-9 0" />
        <Path d="M20 18l-7 0" />
        <Path d="M8 8l-4 4l4 4" />
    </Svg>
)