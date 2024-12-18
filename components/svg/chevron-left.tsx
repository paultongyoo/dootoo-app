import Svg, { Path } from "react-native-svg";

// Source: https://lucide.dev/icons/chevron-left
export const ChevronLeft = ({wxh, color, strokeWidth}) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left">
        <Path d="m15 18-6-6 6-6"/>
    </Svg>
)