import { createContext, useState } from 'react';
import { initalizeUser, resetAllData, loadLocalUser } from './Storage';

// Create the context
export const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {
    const [username, setUsername] = useState('');
    const [anonymousId, setAnonymousId] = useState('');
    const [doneCount, setDoneCount] = useState(0);
    const [tipCount, setTipCount] = useState(0);
    const [dootooItems, setDootooItems] = useState([]);
    const [lastRecordedCount, setLastRecordedCount] = useState(0);
    const [selectedItem, setSelectedItem] = useState(null);

    const initializeLocalUser = async(callback) => {
      const userData = await initalizeUser();
      setUsername(userData.name);
      setAnonymousId(userData.anonymousId);
      updateUserCountContext();

      if (callback) {
        callback(userData.isNew);
      }
    }

    const updateUserCountContext = async() => {
      const localUser = await loadLocalUser();
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