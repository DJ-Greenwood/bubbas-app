// src/app/journal/page.tsx
// this is a Next.js page component for the Journal feature.
// This page allows users to view their journal entries, edit them move them to the trash and later delete them.
'use client';

import React from 'react';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth';
import JournalPage from '../../components/JournalChat/JournalPage';
import JournalWraper from '../../components/JournalChat/Journal/JournalLoader';

export default function Journal() {
return (
  <>
  <RequireAuth>
    <JournalWraper>
      <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Journal with Bubba</h1>
      
        <JournalPage />
      </div>
    </JournalWraper>
  </RequireAuth>
  </>
);
}
