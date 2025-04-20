import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import Link from 'next/link';
import './globals.css';

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
      <head>

      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <header className="bg-gray-100 py-4">
        <nav className="container mx-auto">
        {/* TODO: Replace with actual authentication check */}
        {true ? ( // Placeholder: Replace 'true' with actual authentication check
          <ul className="flex space-x-4">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/chat">Chat</Link></li>
          <li><Link href="/journal">Journal</Link></li>
          <li><Link href="/profile">Profile</Link></li>
          </ul>
        ) : null}
        </nav>
      </header>
      <main>{children}</main>
      </body>
    </html>
  );
}
