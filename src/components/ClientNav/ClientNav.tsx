'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../../firebase';

import { setUserUID } from '@/utils/encryption';


export default function ClientNav() {
  const {user } = useAuth();

  useEffect(() => {
      const user = auth.currentUser;
      if (user) {
        setUserUID(user.uid);
      }
    }, []);
    
  return (
    <nav>
      <ul className="flex space-x-4">
        {user ? (
          <>
            <li><Link href="/"> Home </Link></li>
            <li><Link href="/ChatBasic"> Chat Basic </Link></li>
            <li><Link href="/EmotionChat"> Chat </Link></li>
            <li><Link href="/Journal"> Journal </Link> </li>
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
