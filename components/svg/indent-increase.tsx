import Svg, { Path } from "react-native-svg";

// https://tablericons.com/icon/indent-increase
export const IndentIncrease = ({wxh, color, opacity="1.0", strokeWidth="2"}) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke={color} opacity={opacity} strokeLinecap="round" strokeLinejoin="round"
         width={wxh} height={wxh} strokeWidth={strokeWidth}> 
         <Path d="M20 6l-11 0"/> 
         <Path d="M20 12l-7 0"/>
         <Path d="M20 18l-11 0"/> 
         <Path d="M4 8l4 4l-4 4"/> 
    </Svg> 
)