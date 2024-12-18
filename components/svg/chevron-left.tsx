import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/chevron-left
export const ChevronLeft = ({wxh, color, strokeWidth}) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="m15 18-6-6 6-6"/>
    </Svg>
)