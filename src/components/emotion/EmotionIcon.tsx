'use client';
import React from 'react';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { Emotion, getEmotionImagePath } from '@/components/emotion/emotionAssets';

export interface EmotionIconProps {
  emotion: Emotion;
  size?: number; // optional size override
}

const EmotionIcon: React.FC<EmotionIconProps> = ({ emotion, size }) => {
  const { emotionIconSize, characterSet } = useEmotionSettings(); // <-- pulling characterSet too
  const finalSize = size ?? emotionIconSize;

  const src = getEmotionImagePath(emotion, characterSet || "default");

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
