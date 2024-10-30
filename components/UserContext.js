import { createContext, useState } from 'react';

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

    return (
        <UserContext.Provider value={{ 
            username, setUsername,
            anonymousId, setAnonymousId,
            dootooItems, setDootooItems,
            lastRecordedCount, setLastRecordedCount,
            taskCount, setTaskCount,
            doneCount, setDoneCount
             }}>
          {children}
        </UserContext.Provider>
      );
};