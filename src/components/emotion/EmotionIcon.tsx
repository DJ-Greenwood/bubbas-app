'use client';
import React from 'react';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { Emotion, getEmotionImagePath } from '@/components/emotion/emotionAssets';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

export interface EmotionIconProps {
  emotion: Emotion;
  characterSet?: EmotionCharacterKey;
  size?: number;
}

const EmotionIcon: React.FC<EmotionIconProps> = ({ emotion, characterSet, size }) => {
  const { emotionIconSize, characterSet: globalSet } = useEmotionSettings();
  const finalCharacterSet = (characterSet ?? globalSet ?? "bubba") as EmotionCharacterKey;
  const finalSize = size ?? emotionIconSize;

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
