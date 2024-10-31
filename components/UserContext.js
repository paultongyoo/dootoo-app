import { createContext, useState } from 'react';
import { initalizeUser, resetAllData, loadUser } from '../components/Storage';

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
      updateUserCounts(userData.anonymousId);
    }

    const updateUserCounts = async(anonymousId) => {
      console.log("Updating user counts for anonymousId: " + anonymousId);
      const updatedUser = await loadUser(anonymousId);
      setTaskCount(updatedUser.taskCount);
      setDoneCount(updatedUser.doneCount);
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
            initializeLocalUser,
            updateUserCounts
             }}>
          {children}
        </UserContext.Provider>
      );
};