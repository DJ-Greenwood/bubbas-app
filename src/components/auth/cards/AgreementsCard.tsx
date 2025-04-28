'use client';
import React from 'react';
import { UserProfileData } from '../../../utils/userProfileService';
import { parseFirestoreDate } from '../../../utils/parseDate';

const AgreementsCard: React.FC<{ user: UserProfileData }> = ({ user }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-2xl font-semibold mb-4">Agreements</h2>
    <p className="text-gray-700"><strong>Terms:</strong> {parseFirestoreDate(user.createdAt).toLocaleDateString()}</p>
    <p className="text-gray-700"><strong>Privacy:</strong> {parseFirestoreDate(user.createdAt).toLocaleDateString()}</p>
    <p className="text-gray-700"><strong>Ethics:</strong> {parseFirestoreDate(user.createdAt).toLocaleDateString()}</p>
  </div>
);

export default AgreementsCard;
