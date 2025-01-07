import { Animated, Easing } from 'react-native';
import { createContext, useState, useRef } from 'react';
import { initalizeUser, resetAllData, loadCommunityItems } from './Storage';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { pluralize } from './Helpers';

// Create the context
export const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {

    // State Variables:  Changing these SHOULD intentionally cause components to re-render
    const [openItems, setOpenItems] = useState([]);
    const [doneItems, setDoneItems] = useState([]);
    const [communityItems, setCommunityItems] = useState(null); 
    const hasMoreCommunityItems = useRef(false);
    const communityLayoutOpacity = useSharedValue(0);
    const [selectedItem, setSelectedItem] = useState(null);         // Selected Item context of Tips pages
    const [selectedProfile, setSelectedProfile] = useState(null);   // Selected Profile from Tip pages

    // Reference variables:  Changing these should intentionally NOT cause components to re-render
    const isFirstLaunch = useRef(false);
    const swipeableRefs = useRef({});
    const thingRowPositionXs = useRef({});
    const thingRowHeights = useRef({});
    const lastRecordedCount = useRef(0);
    const [username, setUsername] = useState(null);
    const [anonymousId, setAnonymousId] = useState(null);
    const [affirmation, setAffirmation] = useState(null);
    const [doneCount, setDoneCount] = useState(0);
    const [tipCount, setTipCount] = useState(0);
    const [dooDate, setDooDate] = useState(null);
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
      setAffirmation(userData.affirmation);
      setDooDate(userData.createdAt);
      //console.log("username/anonymousId.current values set: " + JSON.stringify(userData));
      if (callback) {
        callback(userData.isNew);
      }
    }

    const initializeCommunityItems = async () => {
      if (!communityItems) {
        console.log("Initializing Community Items...");
        const responseObj = await loadCommunityItems(1);
        hasMoreCommunityItems.current = responseObj.hasMore;
  
        // Fade out community items layout just in case it's in view
        await new Promise((resolve) =>
            communityLayoutOpacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
                if (isFinished) {
                    runOnJS(resolve)();
                }
            }));
  
        setCommunityItems([...responseObj.items])
        console.log(`Community Items array initalized with ${pluralize('item', responseObj.items.length)}.`);
      } else {
        console.log("Community Items array is non-null, ignoring initialization call");
      }
    }

    const resetUserContext = async () => {
      await resetAllData();
      await initializeLocalUser(); 
      isFirstLaunch.current = true;
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
            communityItems, setCommunityItems,
            hasMoreCommunityItems, communityLayoutOpacity,
            initializeCommunityItems,
            username, setUsername,
            anonymousId, setAnonymousId,
            affirmation, setAffirmation,
            doneCount, setDoneCount,
            tipCount, setTipCount,
            dooDate, setDooDate,
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
            clearDoneItems,
            isFirstLaunch
             }}>
          {children}
        </AppContext.Provider>
      );
};