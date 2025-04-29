// EmotionSettingsContext.tsx
import React, { createContext, useContext, useState } from 'react';

const EmotionSettingsContext = createContext<{
    emotionIconSize: number;
    characterSet: string; // Bubba, Rusty, Charlie etc
  }>({
    emotionIconSize: 64,
    characterSet: "default", // fallback if none
  });

export const EmotionSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [emotionIconSize, setEmotionIconSize] = useState(64);
  const [characterSet, setCharacterSet] = useState("default");

  return (
    <EmotionSettingsContext.Provider value={{ emotionIconSize, characterSet }}>
      {children}
    </EmotionSettingsContext.Provider>
  );
};

export const useEmotionSettings = () => useContext(EmotionSettingsContext);
