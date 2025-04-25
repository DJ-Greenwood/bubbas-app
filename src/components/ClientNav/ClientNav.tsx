'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../../firebase';

export default function ClientNav() {
  const {user } = useAuth();

  return (
    <nav>
      <ul className="flex space-x-4">
        {user ? (
          <>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/chat">Chat</Link></li>
            <li><Link href="/journal">Journal</Link></li>
            <li><Link href="/profile">Profile</Link></li>
            <li><button onClick={() => auth.signOut()}>Sign Out</button></li>
          </>
        ) : (
          <li><Link href="/auth">Login</Link></li>
        )}
      </ul>
    </nav>
  );
}
