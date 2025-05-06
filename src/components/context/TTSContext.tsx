'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/utils/firebaseClient';
import { fetchUserProfile, updateTTSPreferences } from '@/utils/userProfileService';
import { speakText, stopSpeaking, getAvailableVoices } from '@/utils/tts';
import { useToast } from '@/hooks/use-toast';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/utils/firebaseClient'; // Assuming you have a Firestore instance exported as `db`

interface TTSContextType {
  isEnabled: boolean;
  isSpeaking: boolean;
  isAutoplayEnabled: boolean;
  voicePreference: string;
  rate: number;
  pitch: number;
  availableVoices: SpeechSynthesisVoice[];
  speak: (text: string) => void;
  stopSpeaking: () => void;
  setVoicePreference: (voice: string) => Promise<void>;
  setRate: (rate: number) => Promise<void>;
  setPitch: (pitch: number) => Promise<void>;
  toggleAutoplay: (enabled: boolean) => Promise<void>;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const TTSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);
  const [voicePreference, setVoicePreferenceState] = useState('');
  const [rate, setRateState] = useState(1.0);
  const [pitch, setPitchState] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsEnabled(false);
        setIsSpeaking(false);
        return;
      }

      if (currentUser) {
        try {
          // Load user profile
          const profile = await fetchUserProfile();

          if (profile) {
            setIsEnabled(profile.features.tts || false);
            setIsAutoplayEnabled(profile.preferences.ttsAutoplay || false);
            if (profile.preferences.ttsVoice) {
              setVoicePreferenceState(profile.preferences.ttsVoice);
            }
            if (profile.preferences.ttsRate) {
              setRateState(profile.preferences.ttsRate);
            }
            if (profile.preferences.ttsPitch) {
              setPitchState(profile.preferences.ttsPitch);
            }
          }

          // Set up Firestore listener for real-time updates
          const docRef = doc(db, 'users', currentUser.uid); // Adjust the path as needed
          const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
            if (!docSnap.exists()) {
              console.warn('TTS settings document does not exist');
              return;
            }

            const data = docSnap.data();
            if (data?.tts) {
              const ttsSettings = data.tts;
              setIsEnabled(ttsSettings.enabled || false);
              setIsAutoplayEnabled(ttsSettings.autoplay || false);
              if (ttsSettings.voice) {
                setVoicePreferenceState(ttsSettings.voice);
              }
              if (ttsSettings.rate) {
                setRateState(ttsSettings.rate);
              }
              if (ttsSettings.pitch) {
                setPitchState(ttsSettings.pitch);
              }
            } else {
              console.warn('TTS data is missing or malformed');
            }
          });

          return () => {
            unsubscribeSnapshot();
          };
        } catch (error) {
          console.error('Failed to load TTS preferences:', error);
        }
      }
    });

    // Load available voices
    getAvailableVoices().then((voices) => {
      setAvailableVoices(voices);
    });

    return () => {
      unsubscribeAuth();
      stopSpeaking();
    };
  }, []);

  const speak = (text: string) => {
    if (!isEnabled) {
      toast({
        title: 'TTS Disabled',
        description: 'Text-to-speech is not enabled in your preferences.',
        variant: 'destructive',
      });
      return;
    }

    setIsSpeaking(true);

    speakText(text, {
      voiceName: voicePreference,
      rate,
      pitch,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: (error) => {
        setIsSpeaking(false);
        console.error('TTS error:', error);
        toast({
          title: 'Speech Error',
          description: 'There was a problem with text-to-speech. Please try again.',
          variant: 'destructive',
        });
      },
    });
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  const setVoicePreference = async (voice: string) => {
    try {
      setVoicePreferenceState(voice);
      await updateTTSPreferences({ ttsVoice: voice });
    } catch (error) {
      console.error('Failed to update voice preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to save voice preference.',
        variant: 'destructive',
      });
    }
  };

  const setRate = async (newRate: number) => {
    try {
      setRateState(newRate);
      await updateTTSPreferences({ ttsRate: newRate });
    } catch (error) {
      console.error('Failed to update rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to save speech rate preference.',
        variant: 'destructive',
      });
    }
  };

  const setPitch = async (newPitch: number) => {
    try {
      setPitchState(newPitch);
      await updateTTSPreferences({ ttsPitch: newPitch });
    } catch (error) {
      console.error('Failed to update pitch:', error);
      toast({
        title: 'Error',
        description: 'Failed to save pitch preference.',
        variant: 'destructive',
      });
    }
  };

  const toggleAutoplay = async (enabled: boolean) => {
    try {
      setIsAutoplayEnabled(enabled);
      await updateTTSPreferences({ ttsAutoplay: enabled });
    } catch (error) {
      console.error('Failed to update autoplay setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to save autoplay preference.',
        variant: 'destructive',
      });
    }
  };

  const contextValue: TTSContextType = {
    isEnabled,
    isSpeaking,
    isAutoplayEnabled,
    voicePreference,
    rate,
    pitch,
    availableVoices,
    speak,
    stopSpeaking: handleStopSpeaking,
    setVoicePreference,
    setRate,
    setPitch,
    toggleAutoplay,
  };

  return <TTSContext.Provider value={contextValue}>{children}</TTSContext.Provider>;
};

export const useTTS = (): TTSContextType => {
  const context = useContext(TTSContext);

  if (context === undefined) {
    throw new Error('useTTS must be used within a TTSProvider');
  }

  return context;
};