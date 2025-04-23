import type { Metadata } from 'next';
import ClientNav from '@/components/ClientNav/ClientNav'; 
import { Geist, Geist_Mono } from 'next/font/google';
import '../../public/assets/css/globals.css';

import Link from 'next/link';

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
  return (
    <html lang="en">
      <head />
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <header className="bg-white py-4">
            <div className="container mx-auto px-4 flex items-center justify-between">
              {/* Left side: Logo or brand */}
              <Link href="/" className="text-2xl font-bold text-gray-800">
                Bubbas.AI
              </Link>

              {/* Right side: Navigation (Login, etc.) */}
              <nav>
                <ClientNav />
              </nav>
            </div>
          </header>

          <main>{children}</main>
        </body>
    </html>
  );
}
