import Svg, { Path } from "react-native-svg";

// https://tablericons.com/icon/edit
export const Edit = ({wxh, color, opacity="1.0", strokeWidth="1.5" }) => (
    <Svg viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}
         width={wxh} height={wxh} strokeWidth={strokeWidth}>
        <Path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"></Path>
        <Path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"></Path>
        <Path d="M16 5l3 3"></Path>
    </Svg> 
)