// src/components/emotion/emotionAssets.ts
import { EmotionCharacterKey, EmotionCharacters } from '@/types/emotionCharacters';

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

export const getEmotionImagePath = (emotion: Emotion, character: EmotionCharacterKey = "bubba"): string => {
  const safeCharacter = character && EmotionCharacters[character] ? character : "bubba";
  const { fileName } = EmotionCharacters[safeCharacter];
  
  return `/assets/images/emotions/${fileName}/${emotion}.jpg`;
};