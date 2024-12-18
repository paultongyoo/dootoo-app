import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/x
export const CloseX = ({ wxh, color, opacity = "1.0" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity}
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M18 6 6 18" />
        <Path d="m6 6 12 12" />
    </Svg>
)