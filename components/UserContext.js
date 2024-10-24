import { createContext, useState } from 'react';

// Create the context
export const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
    const [username, setUsername] = useState('');
    const [anonymousId, setAnonymousId] = useState('');
    const[dootooItems, setDootooItems] = useState([]);

    return (
        <UserContext.Provider value={{ 
            username, setUsername,
            anonymousId, setAnonymousId,
            dootooItems, setDootooItems
             }}>
          {children}
        </UserContext.Provider>
      );
};