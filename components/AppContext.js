import { Animated, Easing } from 'react-native';
import { createContext, useState, useRef } from 'react';
import { initalizeUser, resetAllData } from './Storage';

// Create the context
export const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {
    const [dootooItems, setDootooItems] = useState([]);
    const [userId, setUserId] = useState(-1);
    const [username, setUsername] = useState('');
    const [anonymousId, setAnonymousId] = useState('');
    const [doneCount, setDoneCount] = useState(0);
    const [tipCount, setTipCount] = useState(0);
    const [lastRecordedCount, setLastRecordedCount] = useState(0);
    const [selectedItem, setSelectedItem] = useState(null);
    const [fadeInListOnRender, setFadeInListOnRender] = useState(false);
    const thingRowPositionXs = useRef([]);
    const thingRowHeights = useRef([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const swipeableRefs = useRef([]);

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
        duration: 600,
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
      setUserId(userData.id);
      setUsername(userData.name);
      setAnonymousId(userData.anonymous_id);

      if (callback) {
        callback(userData.isNew);
      }
    }

    const resetUserContext = async () => {
      await resetAllData();
      await initializeLocalUser(); 
      setLastRecordedCount(0);
      setDootooItems([]);
    };

    return (
        <AppContext.Provider value={{ 
            dootooItems, setDootooItems,
            userId, setUserId,
            username, setUsername,
            anonymousId, setAnonymousId,
            lastRecordedCount, setLastRecordedCount,
            doneCount, setDoneCount,
            tipCount, setTipCount,
            resetUserContext,
            initializeLocalUser,
            selectedItem, setSelectedItem,
            fadeInListOnRender, setFadeInListOnRender,
            listOpacity,
            listFadeInAnimation,
            listFadeOutAnimation,
            emptyListCTAOpacity,
            emptyListCTAFadeInAnimation,
            emptyListCTAFadeOutAnimation,
            thingRowPositionXs,
            thingRowHeights,
            selectedProfile, setSelectedProfile,
            swipeableRefs
             }}>
          {children}
        </AppContext.Provider>
      );
};