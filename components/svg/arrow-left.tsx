import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/arrow-left
export const ArrowLeft = ({ wxh, color, strokeWidth ="2", opacity="1.0" }) => (
    <Svg width={wxh} height={wxh} 
         viewBox="0 0 24 24" fill="none" opacity={opacity}
         stroke={color} strokeWidth={strokeWidth} 
         strokeLinecap="round" strokeLinejoin="round">
        <Path d="m12 19-7-7 7-7" />
        <Path d="M19 12H5" />
    </Svg>
)