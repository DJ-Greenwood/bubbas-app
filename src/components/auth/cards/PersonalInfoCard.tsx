'use client';
import React, { useId } from 'react';
import { encryptField } from '../../../utils/encryption';
import { UserProfileData } from '../../../utils/userProfileService';
import { parseFirestoreDate } from '../../../utils/parseDate';
import { getAuth } from 'firebase/auth';
const getUserUid = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  return user ? user.uid : null;
};

const PersonalInfoCard: React.FC<{ user: UserProfileData }> = ({ user }) => {
  let userPassPhrase = '';
  try {
    userPassPhrase = user.passPhrase || '[No pass phrase]';
  } catch (err) {
    console.error("Failed to decrypt passPhrase", err);
    userPassPhrase = '[Error decrypting]';
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4">Personal Information</h2>
      <p className="text-gray-700"><strong>Email:</strong> {user.email}</p>
      {user.username && <p className="text-gray-700"><strong>Username:</strong> {user.username}</p>}
      {user.phoneNumber && <p className="text-gray-700"><strong>Phone Number:</strong> {user.phoneNumber}</p>}
      <p className="text-gray-700"><strong>Created At:</strong> {parseFirestoreDate(user.createdAt).toLocaleDateString()}</p>
      <p className="text-gray-700">
        <strong>Pass Phrase:</strong> 
        <input 
          type="text" 
          value={userPassPhrase} 
          readOnly 
          className="bg-transparent border-none outline-none" 
        />
      </p>
    </div>
  );
};

export default PersonalInfoCard;
