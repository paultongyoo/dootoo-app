import Svg, { Circle, Path } from "react-native-svg";

// https://lucide.dev/icons/user-round
export const UserRound = ({wxh, color, opacity = "1.0", strokeWidth = "2"}) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity}
         stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="8" r="5"/>
            <Path d="M20 21a8 8 0 0 0-16 0"/>
    </Svg>
)