import Svg, { Path, Circle } from "react-native-svg";

// https://lucide.dev/icons/circle-user-round
export const CircleUserRound = ({wxh, color, opacity="1.0", strokeWidth="2"}) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" 
         fill="none" stroke={color} opacity={opacity}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M18 20a6 6 0 0 0-12 0"/>
        <Circle fill="none" cx="12" cy="10" r="4"/>
        <Circle fill="none" cx="12" cy="12" r="10"/>
    </Svg>
)