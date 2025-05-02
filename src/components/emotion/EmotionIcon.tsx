// src/components/emotion/EmotionIcon.tsx
'use client';
import React from 'react';
import { Emotion, getEmotionImagePath } from './emotionAssets';
import { EmotionCharacterKey } from '@/types/emotionCharacters';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';

export interface EmotionIconProps {
  emotion: Emotion;
  characterSet?: EmotionCharacterKey;
  size?: number;
}

const EmotionIcon: React.FC<EmotionIconProps> = ({ 
  emotion, 
  characterSet: propCharacterSet,
  size: propSize
}) => {
  // Get the current settings from context
  const { emotionIconSize, characterSet: contextCharacterSet } = useEmotionSettings();
  
  // Use props if provided, otherwise use context values
  const finalCharacterSet = propCharacterSet || contextCharacterSet;
  const finalSize = propSize || emotionIconSize;
  
  const src = getEmotionImagePath(emotion, finalCharacterSet);

  return (
    <img
      src={src}
      alt={emotion}
      className="object-cover rounded"
      style={{ width: finalSize, height: finalSize }}
    />
  );
};

export default EmotionIcon;