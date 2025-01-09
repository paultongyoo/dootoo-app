import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

export const LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE = "item_counts_polled";
export const LIST_ITEM_EVENT__UPDATE_COUNTS = "item_update_counts";

export const NAVIGATION_EVENT__GO_TO_SECTION = "go_to_section";

export const ListItemEventEmitter = new EventEmitter();
export const ProfileCountEventEmitter = new EventEmitter();
export const NavigationEventEmitter = new EventEmitter();
