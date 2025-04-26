// src/app/journal/page.tsx
'use client';

import React from 'react';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth';
import JournalPage from '../../components/Journal/JournalPage';

export default function Journal() {
return (
  <>
  <RequireAuth>
  <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Journal with Bubba</h1>
  
    <JournalPage />
  </div>
  </RequireAuth>
  </>
);
}
