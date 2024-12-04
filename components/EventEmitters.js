import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";

export const LIST_ITEM_EVENT__DONE_STATE_CHANGED = "item_doneStateChanged";
export const LIST_ITEM_EVENT__POLL_ITEM_COUNTS_RESPONSE = "item_counts_polled";

export const ListItemEventEmitter = new EventEmitter();
export const ProfileCountEventEmitter = new EventEmitter();
