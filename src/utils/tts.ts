// src/utils/tts.ts
type TTSOptions = {
    voiceName?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
  };
  
  export const speakText = (text: string, options: TTSOptions = {}) => {
    // Early return if browser doesn't support speech synthesis
    if (!window.speechSynthesis) {
      const errorMsg = "Text-to-speech is not supported in this browser.";
      console.warn(errorMsg);
      options.onError?.(errorMsg);
      return false;
    }
  
    try {
      // Create utterance with the text to speak
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice if specified
      if (options.voiceName) {
        // Get available voices
        let voices = speechSynthesis.getVoices();
        
        // If voices array is empty, wait for them to load and try again
        if (voices.length === 0) {
          return new Promise<boolean>((resolve) => {
            speechSynthesis.onvoiceschanged = () => {
              voices = speechSynthesis.getVoices();
              const selectedVoice = voices.find(v => 
                v.name.toLowerCase() === options.voiceName?.toLowerCase());
              
              if (selectedVoice) {
                utterance.voice = selectedVoice;
              }
              
              // Continue with speaking
              setupAndSpeak(utterance, options);
              resolve(true);
            };
          });
        } else {
          // Voices are already loaded
          const selectedVoice = voices.find(v => 
            v.name.toLowerCase() === options.voiceName?.toLowerCase());
          
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }
      }
      
      // Setup and speak
      setupAndSpeak(utterance, options);
      return true;
    } catch (error) {
      console.error("TTS error:", error);
      options.onError?.(`Error initializing speech: ${error}`);
      return false;
    }
  };
  
  // Helper function to setup utterance events and speak
  function setupAndSpeak(utterance: SpeechSynthesisUtterance, options: TTSOptions) {
    // Set speech properties
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;
    if (options.volume !== undefined) utterance.volume = options.volume;
    
    // Setup event handlers
    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = (event) => options.onError?.(event.error);
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Speak the text
    speechSynthesis.speak(utterance);
  }
  
  // Get available voices (useful for settings)
  export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      let voices = speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        resolve(voices);
      } else {
        // Wait for voices to be loaded
        speechSynthesis.onvoiceschanged = () => {
          voices = speechSynthesis.getVoices();
          resolve(voices);
        };
      }
    });
  };
  
  // Stop any ongoing speech
  export const stopSpeaking = () => {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
  };