'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../../firebase';
import { setUserUID } from '@/utils/encryption';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ClientNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('/');

  useEffect(() => {
    if (user) {
      setUserUID(user.uid);
    }
    
    // Set the active tab based on the current pathname
    setActiveTab(pathname);
  }, [user, pathname]);
  
  // Function to check if a path is active (for styling)
  const isActive = (path: string) => {
    return pathname === path;
  };

  if (!user) {
    return (
      <nav role="navigation" aria-label="Main Navigation">
        <ul className="flex space-x-4">
          <li>
            <Link href="/auth" className={pathname === "/auth" ? "underline font-bold" : ""}>Login</Link>
          </li>
        </ul>
      </nav>
    );
  }

  return (
    <nav role="navigation" aria-label="Main Navigation" className="w-full">
      <Tabs value={pathname} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger 
            value="/" 
            className={isActive('/') ? 'bg-primary text-primary-foreground' : ''}
            asChild
          >
            <Link href="/">Home</Link>
          </TabsTrigger>
          
          <TabsTrigger 
            value="/ChatBasic" 
            className={isActive('/ChatBasic') ? 'bg-primary text-primary-foreground' : ''}
            asChild
          >
            <Link href="/ChatBasic">Chat Basic</Link>
          </TabsTrigger>
          
          <TabsTrigger 
            value="/EmotionChat" 
            className={isActive('/EmotionChat') ? 'bg-primary text-primary-foreground' : ''}
            asChild
          >
            <Link href="/EmotionChat">Chat</Link>
          </TabsTrigger>
          
          <TabsTrigger 
            value="/Journal" 
            className={isActive('/Journal') ? 'bg-primary text-primary-foreground' : ''}
            asChild
          >
            <Link href="/Journal">Journal</Link>
          </TabsTrigger>
          
          <TabsTrigger 
            value="/dashboard" 
            className={isActive('/dashboard') ? 'bg-primary text-primary-foreground' : ''}
            asChild
          >
            <Link href="/dashboard">Dashboard</Link>
          </TabsTrigger>
          
          <TabsTrigger 
            value="/profile" 
            className={isActive('/profile') ? 'bg-primary text-primary-foreground' : ''}
            asChild
          >
            <Link href="/profile">Profile</Link>
          </TabsTrigger>
          
          <TabsTrigger 
            value="signout" 
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              auth.signOut().then(() => {
                window.location.href = "/";
              });
            }}
          >
            Sign Out
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </nav>
  );
}