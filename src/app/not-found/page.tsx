'use client';
 
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTTS } from '@/components/context/TTSContext'; 
 
export default function NotFound() {
  const { isEnabled, speak } = useTTS();
  
  useEffect(() => {
    // Auto-speak the error message if TTS is enabled
    if (isEnabled) {
      const notFoundMessage = "Oops! Page not found. It seems Bubba can't find this page. Please check the URL or return to the home page.";
      speak(notFoundMessage);
    }
  }, [isEnabled, speak]);
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <img 
          src="/assets/images/emotions/Bubba/confused.jpg" 
          alt="Confused Bubba" 
          className="mx-auto w-32 h-32 rounded-full object-cover mb-6"
        />
        
        <h1 className="text-4xl font-bold text-gray-900 mb-3">404: Page Not Found</h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Oops! It seems Bubba can't find this page. Please check the URL or return to the home page.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="default" size="lg">
            <Link href="/">
              Take Me Home
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg">
            <Link href="/chat">
              Chat with Bubba
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}