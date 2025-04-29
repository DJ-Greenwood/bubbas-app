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

// Dynamic function to generate image paths based on character theme
export function getEmotionImagePath(emotion: Emotion, characterSet: string = "default"): string {
  const emotionImageFileNameMap: Record<Emotion, string> = {
    joyful: "Joyful.jpg",
    peaceful: "Peaceful.jpg",
    tired: "Drained.jpg",
    nervous: "Nervous.jpg",
    frustrated: "Frustrated.jpg",
    grateful: "Greatful.jpg", // typo! should it be 'Grateful'?
    hopeful: "Hopeful.jpg",
    isolated: "Isolated.jpg",
    confused: "Confused.jpg",
    reflective: "Reflective.jpg",
    sad: "Sad.jpg",
    angry: "Angry.jpg",
  };

  const filename = emotionImageFileNameMap[emotion];
  return `/assets/images/${characterSet}/emotions/${filename}`;
}
