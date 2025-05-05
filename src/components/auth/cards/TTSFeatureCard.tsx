'use client';
import React, { useState, useEffect } from 'react';
import { UserProfileData } from '@/types/UserProfileData';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2 } from 'lucide-react';
import { getAvailableVoices, speakText, stopSpeaking } from '@/utils/tts';

const SAMPLE_TEXT = "Hello, I'm Bubba! I'm here to listen and chat whenever you need.";

const TTSFeatureCard: React.FC<{ 
  user: UserProfileData;
  onUpdate?: (updates: Partial<UserProfileData>) => void;
}> = ({ user, onUpdate }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const availableVoices = await getAvailableVoices();
        setVoices(availableVoices);
        
        // Set default voice from user preferences or choose a good default
        const userPreferredVoice = user.preferences.ttsVoice;
        if (userPreferredVoice && availableVoices.some(v => v.name === userPreferredVoice)) {
          setSelectedVoice(userPreferredVoice);
        } else {
          // Try to find a good English voice as default
          const defaultVoice = availableVoices.find(
            v => v.name.includes('English') || v.lang.startsWith('en-')
          );
          if (defaultVoice) {
            setSelectedVoice(defaultVoice.name);
          } else if (availableVoices.length > 0) {
            setSelectedVoice(availableVoices[0].name);
          }
        }
        
        // Set rate and pitch from user preferences
        if (user.preferences.ttsRate) {
          setRate(user.preferences.ttsRate);
        }
        if (user.preferences.ttsPitch) {
          setPitch(user.preferences.ttsPitch);
        }
      } catch (error) {
        console.error("Failed to load voices:", error);
      }
    };
    
    loadVoices();
    
    // Stop any playing speech when unmounting
    return () => {
      stopSpeaking();
    };
  }, [user.preferences]);

  const handlePlaySample = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    
    setIsPlaying(true);
    speakText(SAMPLE_TEXT, {
      voiceName: selectedVoice,
      rate,
      pitch,
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    });
  };

  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value);
    if (onUpdate) {
      onUpdate({
        preferences: {
          ...user.preferences,
          ttsVoice: value
        }
      });
    }
  };

  const handleRateChange = (value: number[]) => {
    const newRate = value[0];
    setRate(newRate);
    if (onUpdate) {
      onUpdate({
        preferences: {
          ...user.preferences,
          ttsRate: newRate
        }
      });
    }
  };

  const handlePitchChange = (value: number[]) => {
    const newPitch = value[0];
    setPitch(newPitch);
    if (onUpdate) {
      onUpdate({
        preferences: {
          ...user.preferences,
          ttsPitch: newPitch
        }
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Text to Speech (TTS)</h2>
        <Volume2 className="h-6 w-6 text-blue-600" />
      </div>
      
      <p className="text-gray-700 mb-4">
        Listen to Bubba read your journal entries aloud. Customize the voice and speech settings below.
      </p>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="voice-select">Voice</Label>
          <Select 
            value={selectedVoice} 
            onValueChange={handleVoiceChange}
          >
            <SelectTrigger id="voice-select">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="speech-rate">Speech Rate</Label>
            <span className="text-sm text-gray-500">{rate.toFixed(1)}x</span>
          </div>
          <Slider
            id="speech-rate"
            min={0.5}
            max={2.0}
            step={0.1}
            value={[rate]}
            onValueChange={handleRateChange}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="speech-pitch">Voice Pitch</Label>
            <span className="text-sm text-gray-500">{pitch.toFixed(1)}x</span>
          </div>
          <Slider
            id="speech-pitch"
            min={0.5}
            max={1.5}
            step={0.1}
            value={[pitch]}
            onValueChange={handlePitchChange}
          />
        </div>
        
        <Button 
          variant={isPlaying ? "destructive" : "default"}
          className="w-full mt-2"
          onClick={handlePlaySample}
        >
          {isPlaying ? "Stop Sample" : "Play Sample"}
        </Button>
        
        {!user.features.tts && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
            This feature is available on Plus and Pro plans. 
            Upgrade your subscription to listen to Bubba speak.
          </div>
        )}
      </div>
    </div>
  );
};

export default TTSFeatureCard;