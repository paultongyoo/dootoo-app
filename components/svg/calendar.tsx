import Svg, { Path, Rect } from "react-native-svg";

// https://lucide.dev/icons/calendar
export const Calendar = ({ wxh, color }) => (
    <Svg width={wxh} height={wxh} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M8 2v4" />
        <Path d="M16 2v4" />
        <Rect width="18" height="18" x="3" y="4" rx="2" />
        <Path d="M3 10h18" />
    </Svg>
);