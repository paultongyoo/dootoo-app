import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/redo-2
export const Redo = ({wxh, color, opacity = "1.0", strokeWidth = "2"}) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity} stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="m15 14 5-5-5-5" />
        <Path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" />
    </Svg>
)