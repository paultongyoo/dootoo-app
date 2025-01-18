import { Animated, Easing } from 'react-native';
import { createContext, useState, useRef } from 'react';
import { initalizeUser, resetAllData, loadCommunityItems, loadItems, DONE_ITEM_FILTER_ONLY_DONE_ITEMS } from './Storage';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { pluralize } from './Helpers';

const FEEDBACK_TAB_WIDTH = 60;

// Create the context 
export const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {

    // State Variables:  Changing these SHOULD intentionally cause components to re-render
    const [openItems, setOpenItems] = useState(null);             // Using null state as "not initialized" indicator
    const [doneItems, setDoneItems] = useState(null);             // Using null state as "not iinitialized" indicator
    const [communityItems, setCommunityItems] = useState(null);   // Using null state as "not iinitialized" indicator
    const hasMoreCommunityItems = useRef(false);
    const hasMoreOpenItems = useRef(true);
    const hasMoreDoneItems = useRef(true);
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
    const feedbackPositionRightX = useSharedValue(FEEDBACK_TAB_WIDTH * -1);

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
        callback();
      }
    }

    const refreshCommunityItems = async () => {
      console.log("Re/Initializing Community Items...");

      // Fade out community items layout just in case it's in view
      await new Promise((resolve) =>
        communityLayoutOpacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
            if (isFinished) {
                runOnJS(resolve)();
            }
        }));
    
      // This should cause the community screen to render a loading animation once opacity turned back up
      setCommunityItems(null);

      await new Promise((resolve) =>
        communityLayoutOpacity.value = withTiming(1, { duration: 300 }, (isFinished) => {
            if (isFinished) {
                runOnJS(resolve)();
            }
      }));

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
    }

    const initializeDoneItems = async () => {
      console.log("Initializing Done Items...");
      const responseObj = await loadItems(true, 1, DONE_ITEM_FILTER_ONLY_DONE_ITEMS);
      hasMoreDoneItems.current = responseObj.hasMore;
      console.log("Setting done items with array of " + responseObj.things.length + " items.");
      setDoneItems([...responseObj.things]);
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
            feedbackPositionRightX,
            openItems, setOpenItems, hasMoreOpenItems,
            doneItems, setDoneItems, hasMoreDoneItems, initializeDoneItems,
            communityItems, setCommunityItems,
            hasMoreCommunityItems, communityLayoutOpacity,
            refreshCommunityItems,
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