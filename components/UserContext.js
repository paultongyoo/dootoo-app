import { createContext, useState } from 'react';
import { initalizeUser, resetAllData } from '../components/Storage';

// Create the context
export const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
    const [username, setUsername] = useState('');
    const [anonymousId, setAnonymousId] = useState('');
    const [taskCount, setTaskCount] = useState(0);
    const [doneCount, setDoneCount] = useState(0);
    const [dootooItems, setDootooItems] = useState([]);
    const [lastRecordedCount, setLastRecordedCount] = useState(0);

    const initializeLocalUser = async() => {
      const userData = await initalizeUser();
      console.log("Result of initializeUser call: " + JSON.stringify(userData));
      setUsername(userData.name);
      setAnonymousId(userData.anonymousId);
      setTaskCount((userData.taskCount) ? userData.taskCount : 0);
      setDoneCount((userData.taskCount) ? userData.taskCount : 0);
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
            taskCount, setTaskCount,
            doneCount, setDoneCount,
            resetUserContext,
            initializeLocalUser
             }}>
          {children}
        </UserContext.Provider>
      );
};