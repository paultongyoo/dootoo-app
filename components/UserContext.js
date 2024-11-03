import { createContext, useState } from 'react';
import { initalizeUser, resetAllData, loadUser } from '../components/Storage';

// Create the context
export const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
    const [username, setUsername] = useState('');
    const [anonymousId, setAnonymousId] = useState('');
    const [doneCount, setDoneCount] = useState(0);
    const [tipCount, setTipCount] = useState(0);
    const [dootooItems, setDootooItems] = useState([]);
    const [lastRecordedCount, setLastRecordedCount] = useState(0);

    const initializeLocalUser = async(callback) => {
      const userData = await initalizeUser();
      setUsername(userData.name);
      setAnonymousId(userData.anonymousId);
      updateUserCounts(userData.anonymousId);

      if (callback) {
        callback(userData.isNew);
      }
    }

    const updateUserCounts = async() => {
      const localUser = await loadUser();
      setDoneCount(localUser.doneCountStr);
      setTipCount(localUser.taskCountStr);
    }

    const resetUserContext = async () => {
      await resetAllData();
      await initializeLocalUser(); 
      setLastRecordedCount(0);
      setDootooItems([]);
    };

    return (
        <UserContext.Provider value={{ 
            username, setUsername,
            anonymousId, setAnonymousId,
            dootooItems, setDootooItems,
            lastRecordedCount, setLastRecordedCount,
            doneCount, setDoneCount,
            tipCount, setTipCount,
            resetUserContext,
            initializeLocalUser,
            updateUserCounts
             }}>
          {children}
        </UserContext.Provider>
      );
};