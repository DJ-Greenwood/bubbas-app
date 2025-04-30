// EmotionSettingsContext.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';
import { EmotionCharacterKey } from '@/types/emotionCharacters'; // ✅ Correct import (assuming you have a shared type file)

// If you don't have a shared type file, define it here instead:
// export type EmotionCharacterKey = "bubba" | "charlie" | "rusty";

const EmotionSettingsContext = createContext<{
  emotionIconSize: number;
  setEmotionIconSize: (size: number) => void;
  characterSet: EmotionCharacterKey;
  setCharacterSet: (set: EmotionCharacterKey) => void;
}>({
  emotionIconSize: 64,
  setEmotionIconSize: () => {},
  characterSet: "bubba",
  setCharacterSet: () => {},
});

export const EmotionSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [emotionIconSize, setEmotionIconSize] = useState<number>(64);
  const [characterSet, setCharacterSet] = useState<EmotionCharacterKey>("bubba");

  const updateEmotionIconSize = (size: number) => {
    if (size >= 16 && size <= 128) {
      setEmotionIconSize(size);
    } else {
      console.warn("emotionIconSize must be between 16 and 128.");
    }
  };

  const updateCharacterSet = (set: EmotionCharacterKey) => {
    const allowedCharacterSets: EmotionCharacterKey[] = ["bubba", "charlie", "rusty"];
    if (allowedCharacterSets.includes(set)) {
      setCharacterSet(set);
    } else {
      console.warn(`Invalid character set. Allowed values are: ${allowedCharacterSets.join(", ")}`);
    }
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

export const useEmotionSettings = () => useContext(EmotionSettingsContext);
