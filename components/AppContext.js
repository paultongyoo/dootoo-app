import { createContext, useState } from 'react';
import { initalizeUser, resetAllData } from './Storage';

// Create the context
export const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {
    const [userId, setUserId] = useState(-1);
    const [username, setUsername] = useState('');
    const [anonymousId, setAnonymousId] = useState('');
    const [doneCount, setDoneCount] = useState(0);
    const [tipCount, setTipCount] = useState(0);
    const [dootooItems, setDootooItems] = useState([]);
    const [lastRecordedCount, setLastRecordedCount] = useState(0);
    const [selectedItem, setSelectedItem] = useState(null);

    const initializeLocalUser = async(callback) => {
      //console.log("initializeLocalUser");
      const userData = await initalizeUser();
      setUserId(userData.id);
      setUsername(userData.name);
      setAnonymousId(userData.anonymous_id);
      updateUserCountContext();

      if (callback) {
        callback(userData.isNew);
      }
    }

    const updateUserCountContext = async() => {
      const localUser = await initalizeUser();
      setDoneCount(localUser.doneCountStr);
      setTipCount(localUser.tipCountStr);
    }

    const resetUserContext = async () => {
      await resetAllData();
      await initializeLocalUser(); 
      setLastRecordedCount(0);
      setDootooItems([]);
    };

    return (
        <AppContext.Provider value={{ 
            userId, setUserId,
            username, setUsername,
            anonymousId, setAnonymousId,
            dootooItems, setDootooItems,
            lastRecordedCount, setLastRecordedCount,
            doneCount, setDoneCount,
            tipCount, setTipCount,
            resetUserContext,
            initializeLocalUser,
            updateUserCountContext,
            selectedItem, setSelectedItem
             }}>
          {children}
        </AppContext.Provider>
      );
};