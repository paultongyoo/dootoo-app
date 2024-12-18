import Svg, { Path } from "react-native-svg";

// https://lucide.dev/icons/calendar-plus
export const CalendarAdd = ({ wxh, color }) => (
    <Svg width={wxh} height={wxh}
        viewBox="0 0 24 24" fill="none" stroke={color}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M8 2v4" />
        <Path d="M16 2v4" />
        <Path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
        <Path d="M3 10h18" />
        <Path d="M16 19h6" />
        <Path d="M19 16v6" />
    </Svg>
);