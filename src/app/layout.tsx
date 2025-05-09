// src/app/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { EmotionSettingsProvider } from '@/components/context/EmotionSettingsContext';
import { Toaster } from '@/components/ui/toaster';
import { TTSProvider } from '@/components/context/TTSContext';
import Link from 'next/link';
import UpdatedClientNav from '@/components/ClientNav/UpdatedClientNav';
import { colors, typography, spacing } from '@/styles/design-system';
import { ThemeDebugger } from '@/components/Theme-Debugger';

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
          attribute="data-theme"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark']}
        >
          <EmotionSettingsProvider>
            <TTSProvider>
              <header className="bg-background py-4 border-b border-border">
                <div className="container mx-auto px-4 flex items-center justify-between">
                  <Link href="/" className="text-2xl font-bold text-foreground">
                    Bubbas.AI
                  </Link>
                  <nav>
                    <UpdatedClientNav />
                  </nav>
                </div>
              </header>
              <main className="bg-background min-h-screen text-foreground">{children}</main>
              <Toaster />
              {process.env.NODE_ENV === 'development' && <ThemeDebugger />}
            </TTSProvider>
          </EmotionSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}