'use client';

import React from 'react';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth';
import JournalTrashPage from '@/components/JournalChat/Journal/JournalTrashPage';

export default function JournalTrash() {
  return (
    <RequireAuth>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Journal Trash</h1>
        <JournalTrashPage />
      </div>
    </RequireAuth>
  );
}