'use client';
import React from 'react';
import { UserProfileData } from '../../../utils/userProfileService';
import { parseFirestoreDate } from '../../../utils/parseDate';
import { getAuth } from 'firebase/auth';

const getUserUid = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  return user ? user.uid : null;
};

const PersonalInfoCard: React.FC<{ user: UserProfileData }> = ({ user }) => {
  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-xl font-semibold mb-4">Personal Information</h3>

      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Username:</strong> {user.username || '[No username set]'}</p>
      <p><strong>Phone Number:</strong> {user.phoneNumber || '[No phone number set]'}</p>
      <p><strong>Created At:</strong> {new Date(user.createdAt).toLocaleString()}</p>
    </div>
  );
};
export default PersonalInfoCard;