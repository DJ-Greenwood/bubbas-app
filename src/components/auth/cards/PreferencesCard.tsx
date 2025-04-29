'use client';
import React from 'react';
import { UserProfileData } from '../../../utils/userProfileService';

const PreferencesCard: React.FC<{ user: UserProfileData; onUpdate: (updates: Partial<UserProfileData>) => void }> = ({ user, onUpdate }) => {
  const [emotionCharacterSet, setCharacterSet] = React.useState<string>('bubba');
  const [emotionIconSize, setEmotionIconSize] = React.useState<number>(32); // Default size

  const handleToggleLocalStorage = () => {
    const updatedPreference = !user.preferences.localStorageEnabled;
    
    onUpdate({
      preferences: {
        ...user.preferences,
        localStorageEnabled: updatedPreference
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4">Preferences</h2>
      <p className="text-gray-700"><strong>Emotion Character Set:</strong> {user.preferences.emotionCharacterSet}</p>
      <select className='ml-2 border rounded p-1' value={emotionCharacterSet} onChange={(e) => setCharacterSet(e.target.value)}>
        <option value="bubba">Bubba (Black and Tan Yorkie)</option>
        <option value="charlie">Charlie (White Yorkie)</option>
        <option value="rusty">Rusty (Yard Art Yorkie)</option>
      </select>
      <p className='"text-gray-700'><strong>Emotion Icon Size (px):</strong>
        <input className='ml-2 border rounded p-1'
          type="number"
          min={16}
          max={128}
          value={emotionIconSize}
          onChange={(e) => setEmotionIconSize(Number(e.target.value))}
        />
      </p>
      <div className="mt-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={user.preferences.localStorageEnabled ?? false}
            onChange={handleToggleLocalStorage}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span className="text-gray-700">Save encrypted journal entries locally</span>
        </label>
      </div>
    </div>
  );
};

export default PreferencesCard;
