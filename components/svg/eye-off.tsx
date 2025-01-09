import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/eye-off
export const EyeOff = ({ wxh, color, opacity = "1.0", strokeWidth = "2.5" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity}
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
        <Path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
        <Path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
        <Path d="m2 2 20 20" />
    </Svg>
)