// src/components/context/EmotionSettingsContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

interface EmotionSettingsContextType {
  emotionIconSize: number;
  setEmotionIconSize: (size: number) => void;
  characterSet: EmotionCharacterKey;
  setCharacterSet: (set: EmotionCharacterKey) => void;
}

const EmotionSettingsContext = createContext<EmotionSettingsContextType>({
  emotionIconSize: 64,
  setEmotionIconSize: () => {},
  characterSet: "bubba",
  setCharacterSet: () => {},
});

export const useEmotionSettings = () => useContext(EmotionSettingsContext);

export const EmotionSettingsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [emotionIconSize, setEmotionIconSize] = useState<number>(64);
  const [characterSet, setCharacterSet] = useState<EmotionCharacterKey>("bubba");
  
  // Load settings from localStorage if available
  useEffect(() => {
    const savedSize = localStorage.getItem('emotionIconSize');
    const savedCharSet = localStorage.getItem('characterSet');
    
    if (savedSize) {
      const size = parseInt(savedSize, 10);
      if (!isNaN(size)) {
        setEmotionIconSize(size);
      }
    }
    
    if (savedCharSet && ["bubba", "charlie", "rusty"].includes(savedCharSet)) {
      setCharacterSet(savedCharSet as EmotionCharacterKey);
    }
  }, []);
  
  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('emotionIconSize', emotionIconSize.toString());
    localStorage.setItem('characterSet', characterSet);
  }, [emotionIconSize, characterSet]);
  
  const updateEmotionIconSize = (size: number) => {
    if (size >= 16 && size <= 128) {
      setEmotionIconSize(size);
    }
  };

  const updateCharacterSet = (set: EmotionCharacterKey) => {
    setCharacterSet(set);
  };

  return (
    <EmotionSettingsContext.Provider value={{
      emotionIconSize,
      setEmotionIconSize: updateEmotionIconSize,
      characterSet,
      setCharacterSet: updateCharacterSet,
    }}>
      {children}
    </EmotionSettingsContext.Provider>
  );
};