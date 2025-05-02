'use client';
import React from 'react';
import { Emotion, getEmotionImagePath } from './emotionAssets';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

export interface EmotionIconProps {
  emotion: Emotion;
  characterSet?: EmotionCharacterKey;
  size?: number;
}

const EmotionIcon: React.FC<EmotionIconProps> = ({ 
  emotion, 
  characterSet = "bubba",
  size = 64
}) => {
  const src = getEmotionImagePath(emotion, characterSet);

  return (
    <img
      src={src}
      alt={emotion}
      className="object-cover rounded"
      style={{ width: size, height: size }}
    />
  );
};

export default EmotionIcon;