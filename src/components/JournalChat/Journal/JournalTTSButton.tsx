'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Volume } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTTS } from '@/components/context/TTSContext';
import { useSubscription } from '@/utils/subscriptionService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';

interface JournalTTSButtonProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}
``
const JournalTTSButton: React.FC<JournalTTSButtonProps> = ({
  text,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const { isEnabled, isSpeaking, speak, stopSpeaking } = useTTS();
  const { subscription } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = React.useState(false);
  
  // Size configurations
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-10 w-10'
  };
  
  const iconSizes = {
    sm: { height: 14, width: 14 },
    md: { height: 18, width: 18 },
    lg: { height: 20, width: 20 }
  };
  
  const handleClick = () => {
    if (subscription.tier === 'free') {
      setShowUpgradeDialog(true);
      return;
    }
    
    if (!isEnabled) {
      setShowUpgradeDialog(true);
      return;
    }
    
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text);
    }
  };
  
  // If TTS is not available, show a disabled button
  if (!isEnabled && subscription.tier !== 'free') {
    return null; // Don't show the button if TTS is disabled in user preferences
  }
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${sizeClasses[size]} ${className}`}
              onClick={handleClick}
            >
              {isSpeaking ? (
                <VolumeX 
                  className="text-red-600" 
                  height={iconSizes[size].height} 
                  width={iconSizes[size].width} 
                />
              ) : (
                <Volume2 
                  className={subscription.tier === 'free' ? 'text-gray-400' : 'text-blue-600'} 
                  height={iconSizes[size].height} 
                  width={iconSizes[size].width} 
                />
              )}
              {showLabel && (
                <span className="ml-2">
                  {isSpeaking ? 'Stop' : 'Listen'}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {subscription.tier === 'free' 
              ? 'Upgrade to use Text-to-Speech'
              : isSpeaking 
                ? 'Stop speaking' 
                : 'Listen to this entry'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Subscription upgrade dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {subscription.tier === 'free' 
                ? 'Upgrade Required' 
                : 'Enable Text-to-Speech'}
            </DialogTitle>
            <DialogDescription>
              {subscription.tier === 'free' 
                ? 'Text-to-Speech is available on Plus and Pro plans. Upgrade to enable this feature.'
                : 'Text-to-Speech is currently disabled in your preferences. Enable it in your profile settings.'}
            </DialogDescription>
          </DialogHeader>
          {subscription.tier === 'free' && (
            <SubscriptionSelector onClose={() => setShowUpgradeDialog(false)} />
          )}
          {subscription.tier !== 'free' && (
            <div className="flex justify-end mt-4">
              <Button onClick={() => {
                window.location.href = '/profile';
                setShowUpgradeDialog(false);
              }}>
                Go to Settings
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default JournalTTSButton;