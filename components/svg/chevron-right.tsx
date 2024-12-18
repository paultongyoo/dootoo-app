import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/chevron-right
export const ChevronRight = ({wxh, color, opacity="1.0", strokeWidth="2"}) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" opacity={opacity} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="m9 18 6-6-6-6"/>
    </Svg>
)