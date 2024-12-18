import Svg, { Circle, Path } from "react-native-svg";

// https://lucide.dev/icons/ban
export const Ban = ({ wxh, color, strokeWidth = "3", opacity = "1.0" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" 
         opacity={opacity} stroke={color} 
         strokeWidth={strokeWidth} 
         strokeLinecap="round" 
         strokeLinejoin="round" >
        <Circle fill="none" cx="12" cy="12" r="10"/>
        <Path d="m4.9 4.9 14.2 14.2"/>
    </Svg>
)