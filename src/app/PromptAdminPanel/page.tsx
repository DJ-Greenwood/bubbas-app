// app/admin/page.tsx
'use client'; // This is needed for client components in Next.js App Router

import React from 'react';
import PromptAdminPanel from '@/components/PromptAdminPanel/PromptAdminPanel';

export default function AdminPage() {
  return <PromptAdminPanel />;
}