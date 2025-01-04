import Svg, { G, Path } from "react-native-svg";

// https://lucide.dev/icons/asterisk (with G added)
export const Asterisk = ({ wxh, color, opacity = "1.0", strokeWidth = "2", bgColor, bgStrokeWidth = "4" }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" opacity={opacity}
         strokeLinecap="round" strokeLinejoin="round">
        <G stroke={bgColor} strokeWidth={bgStrokeWidth}>
            <Path d="M12 6v12" />
            <Path d="M17.196 9 6.804 15" />
            <Path d="m6.804 9 10.392 6" />
        </G>
        <G stroke={color} strokeWidth={strokeWidth}>
            <Path d="M12 6v12" />
            <Path d="M17.196 9 6.804 15" />
            <Path d="m6.804 9 10.392 6" />
        </G>
    </Svg>
)