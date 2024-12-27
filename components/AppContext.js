import { Animated, Easing } from 'react-native';
import { createContext, useState, useRef } from 'react';
import { initalizeUser, resetAllData } from './Storage';

// Create the context
export const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {

    // State Variables:  Changing these SHOULD intentionally cause components to re-render
    const [openItems, setOpenItems] = useState([]);
    const [doneItems, setDoneItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);         // Selected Item context of Tips pages
    const [selectedProfile, setSelectedProfile] = useState(null);   // Selected Profile from Tip pages

    // Reference variables:  Changing these should intentionally NOT cause components to re-render
    const swipeableRefs = useRef({});
    const thingRowPositionXs = useRef({});
    const thingRowHeights = useRef({});
    const lastRecordedCount = useRef(0);
    const [username, setUsername] = useState(null);
    const [anonymousId, setAnonymousId] = useState(null);
    const [doneCount, setDoneCount] = useState(0);
    const [tipCount, setTipCount] = useState(0);
    const itemCountsMap = useRef(new Map());
    const currentlyTappedThing = useRef(null);   

    // Animation related
    const emptyListCTAOpacity = useRef(new Animated.Value(0)).current;
    const emptyListCTAFadeInAnimation = Animated.timing(emptyListCTAOpacity, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
    });
    const emptyListCTAFadeOutAnimation = Animated.timing(emptyListCTAOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
    });

    const initializeLocalUser = async(callback) => {
      const userData = await initalizeUser();
      setUsername(userData.name);
      setAnonymousId(userData.anonymous_id);
      //console.log("username/anonymousId.current values set: " + JSON.stringify(userData));
      if (callback) {
        callback(userData.isNew);
      }
    }

    const resetUserContext = async () => {
      await resetAllData();
      await initializeLocalUser(); 
      setOpenItems([]);
      setDoneItems([]);
    };

    const clearOpenItems = () => {
      setOpenItems([]);
    }

    const clearDoneItems = () => {
      setDoneItems([]);
    }

    return (
        <AppContext.Provider value={{ 
            openItems, setOpenItems,
            doneItems, setDoneItems,
            username, setUsername,
            anonymousId, setAnonymousId,
            doneCount, setDoneCount,
            tipCount, setTipCount,
            lastRecordedCount,
            resetUserContext,
            initializeLocalUser,
            selectedItem, setSelectedItem,
            emptyListCTAOpacity,
            emptyListCTAFadeInAnimation,
            emptyListCTAFadeOutAnimation,
            thingRowPositionXs,
            thingRowHeights,
            selectedProfile, setSelectedProfile,
            swipeableRefs,
            itemCountsMap,
            currentlyTappedThing,
            clearOpenItems,
            clearDoneItems
             }}>
          {children}
        </AppContext.Provider>
      );
};