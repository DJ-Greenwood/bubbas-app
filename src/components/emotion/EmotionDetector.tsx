'use client';
import {askQuestion} from '@/utils/chatServices';
import { Emotion } from './emotionAssets';

export const detectEmotion = async (message: string): Promise<Emotion> => {
  const { reply } = await askQuestion(`
    This is a short message from someone: "${message}". 
    Based on tone and word choice, what emotion are they likely feeling? 
    Respond with only one word: joyful, peaceful, tired, nervous, frustrated, grateful, hopeful, isolated, confused, reflective, sad, or angry.
  `);

  const cleaned = reply.trim().toLowerCase() as Emotion;

  const allowedEmotions: Emotion[] = [
    "joyful", "peaceful", "tired", "nervous", "frustrated",
    "grateful", "hopeful", "isolated", "confused", "reflective",
    "sad", "angry",
  ];

  if (allowedEmotions.includes(cleaned)) {
    return cleaned;
  }

  console.warn("Unexpected emotion returned:", cleaned);
  return "reflective"; // fallback
};

