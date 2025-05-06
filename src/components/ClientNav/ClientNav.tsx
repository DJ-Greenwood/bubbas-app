'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '@/utils/firebaseClient';
import { setUserUID } from '@/utils/encryption';

export default function ClientNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (user) {
      setUserUID(user.uid);
    }
  }, [user]);
  

  return (
    <nav role="navigation" aria-label="Main Navigation">
      <ul className="flex space-x-4">
        {user ? (
          <>
            <li>
              <Link href="/" className={pathname === "/" ? "underline font-bold" : ""}>Home</Link>
            </li>
            <li>
              <Link href="/ChatBasic" className={pathname === "/ChatBasic" ? "underline font-bold" : ""}>Chat Basic</Link>
            </li>
            <li>
              <Link href="/EmotionChat" className={pathname === "/EmotionChat" ? "underline font-bold" : ""}>Chat</Link>
            </li>
            <li>
              <Link href="/Journal" className={pathname === "/Journal" ? "underline font-bold" : ""}>Journal</Link>
            </li>
            <li>
              <Link href={"/dashboard"} className={pathname === "/dashboard" ? "underline font-bold" : ""}>Dashboard</Link>
            </li>
            <li>
              <Link href="/profile" className={pathname === "/profile" ? "underline font-bold" : ""}>Profile</Link>
            </li>
            <li>
                <button 
                onClick={() => {
                  auth.signOut().then(() => {
                  window.location.href = "/";
                  });
                }} 
                className="text-red-600 hover:underline"
                >
                Sign Out
                </button>
            </li>
          </>
        ) : (
          <li>
            <Link href="/auth" className={pathname === "/auth" ? "underline font-bold" : ""}>Login</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}