import Svg, { Path } from "react-native-svg";


export const ThumbDown = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => (
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
        <Path d="M7 13v-8a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v7a1 1 0 0 0 1 1h3a4 4 0 0 1 4 4v1a2 2 0 0 0 4 0v-5h3a2 2 0 0 0 2 -2l-1 -5a2 3 0 0 0 -2 -2h-7a3 3 0 0 0 -3 3" />
    </Svg>
)