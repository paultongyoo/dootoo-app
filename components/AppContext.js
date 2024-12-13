import { Animated, Easing } from 'react-native';
import { createContext, useState, useRef } from 'react';
import { initalizeUser, resetAllData } from './Storage';
import { ProfileCountEventEmitter } from './EventEmitters';

// Create the context
export const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {

    // State Variables:  Changing these SHOULD intentionally cause components to re-render
    const [dootooItems, setDootooItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);         // Selected Item context of Tips pages
    const [selectedProfile, setSelectedProfile] = useState(null);   // Selected Profile from Tip pages
    
    // Reference variables:  Changing these should intentionally NOT cause components to re-render
    const swipeableRefs = useRef({});
    const fadeInListOnRender = useRef(false);
    const thingRowPositionXs = useRef({});
    const thingRowHeights = useRef({});
    const lastRecordedCount = useRef(0);
    const username = useRef();
    const anonymousId = useRef();
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

    const listOpacity = useRef(new Animated.Value(0)).current;
    const listFadeInAnimation = Animated.timing(listOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
    });
    const listFadeOutAnimation = Animated.timing(listOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
    });

    const initializeLocalUser = async(callback) => {
      //console.log("initializeLocalUser");
      const userData = await initalizeUser();
      username.current = userData.name;
      ProfileCountEventEmitter.emit("username_set", {name: userData.name });
      anonymousId.current = userData.anonymous_id;

      if (callback) {
        callback(userData.isNew);
      }
    }

    const resetUserContext = async () => {
      await resetAllData();
      await initializeLocalUser(); 
      setDootooItems([]);
    };

    return (
        <AppContext.Provider value={{ 
            dootooItems, setDootooItems,
            username,
            anonymousId, 
            lastRecordedCount,
            resetUserContext,
            initializeLocalUser,
            selectedItem, setSelectedItem,
            fadeInListOnRender,
            listOpacity,
            listFadeInAnimation,
            listFadeOutAnimation,
            emptyListCTAOpacity,
            emptyListCTAFadeInAnimation,
            emptyListCTAFadeOutAnimation,
            thingRowPositionXs,
            thingRowHeights,
            selectedProfile, setSelectedProfile,
            swipeableRefs,
            itemCountsMap,
            currentlyTappedThing
             }}>
          {children}
        </AppContext.Provider>
      );
};