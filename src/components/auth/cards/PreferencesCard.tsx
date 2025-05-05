'use client';
import React from 'react';
import { UserProfileData } from '@/types/UserProfileData';
import { useEmotionSettings } from "@/components/context/EmotionSettingsContext";
import { EmotionCharacters, EmotionCharacterKey } from "@/types/emotionCharacters";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import TTSToggle from '@/components/tts/TTSToggle';
import { useSubscription } from '@/utils/subscriptionService';

const PreferencesCard: React.FC<{ user: UserProfileData; onUpdate: (updates: Partial<UserProfileData>) => void }> = ({ user, onUpdate }) => {
  const { emotionIconSize, setEmotionIconSize, characterSet, setCharacterSet } = useEmotionSettings();
  const { subscription } = useSubscription();

  const handleToggleLocalStorage = () => {
    const updatedPreference = !user.preferences.localStorageEnabled;
    
    onUpdate({
      preferences: {
        ...user.preferences,
        localStorageEnabled: updatedPreference
      }
    });
  };

  const handleToggleTTSAutoplay = (enabled: boolean) => {
    onUpdate({
      preferences: {
        ...user.preferences,
        ttsAutoplay: enabled
      }
    });
  };

  const handleToggleTTSFeature = (enabled: boolean) => {
    // This updates the feature flag itself
    onUpdate({
      features: {
        ...user.features,
        tts: enabled
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4">Preferences</h2>
      
      <div className="space-y-6">
        {/* Emotion Character Set */}
        <div>
          <p className="text-gray-700 mb-2"><strong>Emotion Character Set:</strong></p>
          <select
            className="w-full p-2 border rounded"
            value={characterSet}
            onChange={(e) => {
              const newCharacterSet = e.target.value as EmotionCharacterKey;
              setCharacterSet(newCharacterSet);
              onUpdate({
                preferences: {
                  ...user.preferences,
                  emotionCharacterSet: newCharacterSet
                }
              });
            }}
          >
            {Object.entries(EmotionCharacters).map(([key, { displayName }]) => (
              <option key={key} value={key}>
                {displayName}
              </option>
            ))}
          </select>
        </div>
        
        {/* Emotion Icon Size */}
        <div>
          <p className="text-gray-700 mb-2"><strong>Emotion Icon Size (px):</strong></p>
          <input 
            className="w-full border rounded p-2"
            type="number"
            min={16}
            max={128}
            value={emotionIconSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setEmotionIconSize(newSize);
              onUpdate({
                preferences: {
                  ...user.preferences,
                  emotionIconSize: newSize
                }
              });
            }}
          />
        </div>
        
        {/* Local Storage Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="local-storage"
            checked={user.preferences.localStorageEnabled ?? false}
            onCheckedChange={handleToggleLocalStorage}
          />
          <Label htmlFor="local-storage">Save encrypted journal entries locally</Label>
        </div>
        
        {/* TTS Feature Toggle (Plus/Pro only) */}
        <div className="pt-2 border-t">
          <h3 className="text-lg font-medium mb-3">Text-to-Speech Features</h3>
          
          <div className="space-y-4">
            <TTSToggle 
              enabled={user.features.tts ?? false}
              onToggle={handleToggleTTSFeature}
              label="Enable Text-to-Speech"
            />
            
            {user.features.tts && subscription.tier !== 'free' && (
              <div className="flex items-center space-x-2 ml-6">
                <Switch
                  id="tts-autoplay"
                  checked={user.preferences.ttsAutoplay ?? false}
                  onCheckedChange={handleToggleTTSAutoplay}
                />
                <Label htmlFor="tts-autoplay">Automatically read Bubba's responses</Label>
              </div>
            )}
            
            {subscription.tier === 'free' && (
              <p className="text-sm text-gray-500 italic">
                Text-to-Speech features are available in Plus and Pro plans.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesCard;