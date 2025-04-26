'use client';
import chatService from '../../utils/firebaseChatService';
import { Emotion } from './EmotionIcon';

export const detectEmotion = async (message: string): Promise<Emotion> => {
  const analysisPrompt = `This is a short message from someone: "${message}". Based on tone and word choice, what emotion are they likely feeling? Respond with only one word: joyful, peaceful, tired, nervous, frustrated, grateful, hopeful, isolated, confused, reflective, sad, or angry.`;
  
  const result: string = await chatService.generateResponse(analysisPrompt);
  const cleaned = result.trim().toLowerCase() as Emotion;

  const allowedEmotions: Emotion[] = [
    "joyful", "peaceful", "tired", "nervous", "frustrated",
    "grateful", "hopeful", "isolated", "confused", "reflective",
    "sad", "angry"
  ];

  if (allowedEmotions.includes(cleaned)) {
    return cleaned;
  }

  console.warn("Unexpected emotion returned:", result);
  return "reflective"; // fallback safe
};
