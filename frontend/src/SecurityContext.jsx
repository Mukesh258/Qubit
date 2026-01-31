import React, { createContext, useContext, useState } from 'react';

const SecurityContext = createContext();

export const SecurityProvider = ({ children }) => {
    const [eavesdroppingActive, setEavesdroppingActive] = useState(false);
    const [tamperingActive, setTamperingActive] = useState(false);
    const [qber, setQber] = useState(0);
    const [mitmAttempts, setMitmAttempts] = useState(0);
    const [tamperingDetected, setTamperingDetected] = useState(0);
    const [lastThreatAlert, setLastThreatAlert] = useState('None');

    return (
        <SecurityContext.Provider value={{
            eavesdroppingActive,
            setEavesdroppingActive,
            tamperingActive,
            setTamperingActive,
            qber,
            setQber,
            mitmAttempts,
            setMitmAttempts,
            tamperingDetected,
            setTamperingDetected,
            lastThreatAlert,
            setLastThreatAlert
        }}>
            {children}
        </SecurityContext.Provider>
    );
};

export const useSecurity = () => useContext(SecurityContext);
