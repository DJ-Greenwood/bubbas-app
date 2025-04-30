// Types
export interface UserProfileData {
  email: string;  
  createdAt: string;
  agreedTo: { terms: string; privacy: string; ethics: string; };
  preferences: { username?: string; phoneNumber?: string; tone: string; theme: string; emotionCharacterSet: string; emotionIconSize: string; localStorageEnabled?: boolean;  security: {passPhrase: string;}};
  usage: { tokens: { lifetime: number; monthly: any; }; voiceChars: { tts: any; stt: any; }; };
  subscription: { tier: string; activationDate: string; expirationDate: string; };
  features: { memory: boolean; tts: boolean; stt: boolean; emotionalInsights: boolean; };
  
}
