'use client';
import React from 'react';

export type Emotion =
  | "joyful" 
  | "peaceful" 
  | "tired" 
  | "nervous"
  | "frustrated" 
  | "grateful" 
  | "hopeful" 
  | "isolated"
  | "confused" 
  | "reflective" 
  | "sad" 
  | "angry";

export interface EmotionIconProps {
  emotion: Emotion;
  size?: number; // optional size override
}

const EmotionIcon: React.FC<EmotionIconProps> = ({ emotion, size = 64 }) => {
  const emotionImageMap: Record<Emotion, string> = {
    joyful: "/assets/images/emotions/Joyful.jpg",
    peaceful: "/assets/images/emotions/Peaceful.jpg",
    tired: "/assets/images/emotions/Drained.jpg",
    nervous: "/assets/images/emotions/Nervous.jpg",
    frustrated: "/assets/images/emotions/Frustrated.jpg",
    grateful: "/assets/images/emotions/Greatful.jpg",
    hopeful: "/assets/images/emotions/Hopeful.jpg",
    isolated: "/assets/images/emotions/Isolated.jpg",
    confused: "/assets/images/emotions/Confused.jpg",
    reflective: "/assets/images/emotions/Reflective.jpg",
    sad: "/assets/images/emotions/Sad.jpg",
    angry: "/assets/images/emotions/Angry.jpg",
  };

  const src = emotionImageMap[emotion] || "/assets/images/emotions/default.jpg";

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
