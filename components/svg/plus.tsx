import Svg, { G, Path } from "react-native-svg";

// https://lucide.dev/icons/plus (with G added)
export const Plus = ({ wxh, color, opacity = "1.0", strokeWidth = "2", bgColor, bgStrokeWidth = "2" }) => (
<Svg width={wxh} height={wxh} viewBox="0 0 24 24" opacity={opacity}>
  {/* Outer stroke */}
  <G stroke={bgColor} strokeWidth={bgStrokeWidth}>
    <Path d="M5 12h14" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 5v14" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </G>

  {/* Inner stroke */}
  <G>
    <Path d="M5 12h14" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 5v14" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </G>
</Svg>
)