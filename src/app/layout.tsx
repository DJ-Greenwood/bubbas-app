// src/app/layout.tsx
import type { Metadata } from 'next';
import UpdatedClientNav from '@/components/ClientNav/UpdatedClientNav'; 
import { Geist, Geist_Mono } from 'next/font/google';
import '../../public/assets/css/globals.css';
import Link from 'next/link';
import { AuthProvider } from '@/components/context/AuthContext';
import { EmotionSettingsProvider } from '@/components/context/EmotionSettingsContext'; // 👈 Import EmotionSettingsProvider
import { notFound } from 'next/navigation';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Bubbas AI Emotional Chat',
  description: 'A chat application powered by Bubba AI, designed to help you express your emotions and reflect on your day.',
  icons: {
    icon: '/assets/images/BubbasFriends/Rusty.jpg',
    shortcut: '/assets/images/BubbasFriends/Rusty.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isPageNotFound = false; // Replace with your logic to determine if the page is not found

  if (isPageNotFound) {
    notFound(); // This will render the default 404 page or a custom one if defined
  }

  return (
    <html lang="en">
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <EmotionSettingsProvider>
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
          </EmotionSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}