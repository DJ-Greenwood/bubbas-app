// src/app/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../../public/assets/css/globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { EmotionSettingsProvider } from '@/components/context/EmotionSettingsContext';
import { Toaster } from '@/components/ui/toaster';
import { TTSProvider } from '@/components/context/TTSContext';
import Link from 'next/link';
import UpdatedClientNav from '@/components/ClientNav/UpdatedClientNav';
import { colors, typography, spacing } from '@/styles/design-system';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bubbas.AI - Your AI Emotional Wellness Companion',
  description: 'Bubbas.AI helps you track your emotions, journal your thoughts, and find emotional support with an AI companion.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark']} // Ensure these themes match your CSS variables
        >
          <EmotionSettingsProvider>
            <TTSProvider>
              <header className="bg-white py-4">
                <div className="container mx-auto px-4 flex items-center justify-between">
                  <Link href="/" className="text-2xl font-bold text-gray-800">
                    Bubbas.AI
                  </Link>
                  <nav>
                    <UpdatedClientNav />
                  </nav>
                </div>
              </header>
              <main>{children}</main>
              <Toaster />
            </TTSProvider>
          </EmotionSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}