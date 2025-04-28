'use client';
import React from 'react';
import { UserProfileData } from '../../../utils/userProfileService';

const PreferencesCard: React.FC<{ user: UserProfileData; onUpdate: (updates: Partial<UserProfileData>) => void }> = ({ user, onUpdate }) => {

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
      <p className="text-gray-700"><strong>Tone:</strong> {user.preferences.tone}</p>
      <p className="text-gray-700"><strong>Theme:</strong> {user.preferences.theme}</p>
      <p className="text-gray-700"><strong>Start Page:</strong> {user.preferences.startPage}</p>

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
