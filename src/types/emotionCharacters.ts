// src/types/emotionCharacters.ts
export type EmotionCharacterKey = "bubba" | "charlie" | "rusty";

export interface EmotionCharacterMeta {
  displayName: string;
  fileName: string;
}

export const EmotionCharacters: Record<EmotionCharacterKey, EmotionCharacterMeta> = {
  bubba: {
    displayName: "Bubba (Black and Tan)",
    fileName: "Bubba", // maps to /assets/images/emotions/Bubba/
  },
  charlie: {
    displayName: "Charlie (White Yorkie)",
    fileName: "Charlie",
  },
  rusty: {
    displayName: "Rusty (Yard Art Yorkie)",
    fileName: "Rusty",
  },
};