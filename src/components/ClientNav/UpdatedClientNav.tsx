'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '@/utils/firebaseClient';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LoginDialog } from '../auth/Login';
import { SignUpDialog } from '../auth/SignUp';

export default function ClientNav() {
// Suggested code may be subject to a license. Learn more: ~LicenseLog:1704083582.
  const { user } = useAuth();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('/');
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [UserUID, setUserUID] = useState("");

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
      <nav role="navigation" aria-label="Main Navigation" className="w-full flex justify-between items-center p-4">
         <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLoginOpen(true)}
          >
            Login
          </Button>
          <Button 
            onClick={() => setSignupOpen(true)}
          >
            Sign Up
          </Button>
          
          <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
          <SignUpDialog open={signupOpen} onOpenChange={setSignupOpen} />
        </div>
      </nav>
    );
  }

  return (
    <nav role="navigation" aria-label="Main Navigation" className="w-full overflow-x-auto">
      <Tabs value={pathname} className="w-full">
        <TabsList className="flex flex-wrap justify-center gap-2 p-2 sm:justify-start">
            <TabsTrigger
            value="/"
            className={`min-w-[80px] text-center ${isActive('/') ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            >
            <Link href="/">Home</Link>
            </TabsTrigger>

            <TabsTrigger
            value ="/PromptAdminPanel"
            className={`min-w-[80px] text-center ${isActive('/admin') ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            ><Link href="/PromptAdminPanel">Admin</Link>
            </TabsTrigger>

            <TabsTrigger 
            value="/ChatConversation"
            className={`min-w-[80px] text-center ${isActive('/ChatConversation') ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            >
             <Link href="/ChatConversation">Chat Conversation</Link>
            </TabsTrigger>
            
            <TabsTrigger
            value="/ChatBasic"
            className={`min-w-[80px] text-center ${isActive('/ChatBasic') ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            >
            <Link href="/ChatBasic">Chat Basic</Link>
            </TabsTrigger>
            
            <TabsTrigger
            value="/GeminiChat"
            className={`min-w-[80px] text-center ${isActive('/GeminiChat') ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            >
            <Link href="/GeminiChat">Gemini Chat</Link>
            </TabsTrigger>
            
            <TabsTrigger
            value="/EmotionChat"
            className={`min-w-[80px] text-center ${isActive('/EmotionChat') ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            >
            <Link href="/EmotionChat">Chat</Link>
            </TabsTrigger>
            
            <TabsTrigger
            value="/Journal"
            className={`min-w-[80px] text-center ${isActive('/Journal') ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            >
            <Link href="/Journal">Journal</Link>
            </TabsTrigger>
            
            <TabsTrigger
            value="/dashboard"
            className={`min-w-[80px] text-center ${isActive('/dashboard') ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            >
            <Link href="/dashboard">Dashboard</Link>
            </TabsTrigger>
            
            <TabsTrigger
            value="/profile"
            className={`min-w-[80px] text-center ${isActive('/profile') ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            >
            <Link href="/profile">Profile</Link>
            </TabsTrigger>
            
            <TabsTrigger
            value="signout"
            className="min-w-[80px] text-center text-red-600 hover:text-red-700"
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