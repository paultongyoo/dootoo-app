import Svg, { G, Path } from "react-native-svg";

// https://lucide.dev/icons/chevron-last + rotated 90 degrees counter clockwise
export const MoveToTop = ({ wxh, color, opacity = "1.0", strokeWidth = "2" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity}
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <G transform="rotate(-90 12 12)">
            <Path d="m7 18 6-6-6-6" />
            <Path d="M17 6v12" />
        </G>
    </Svg>
)