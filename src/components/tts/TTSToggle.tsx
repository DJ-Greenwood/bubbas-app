'use client';
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/utils/subscriptionService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';

interface TTSToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

const TTSToggle: React.FC<TTSToggleProps> = ({
  enabled,
  onToggle,
  label = "Text-to-Speech",
  showIcon = true,
  className = "",
}) => {
  const [showUpgradeDialog, setShowUpgradeDialog] = React.useState(false);
  const { toast } = useToast();
  const { subscription } = useSubscription();
  
  const handleToggle = (checked: boolean) => {
    // Check if user has necessary subscription
    if (checked && subscription.tier === 'free') {
      setShowUpgradeDialog(true);
      return;
    }
    
    onToggle(checked);
    
    toast({
      title: checked ? "TTS Enabled" : "TTS Disabled",
      description: checked 
        ? "Bubba will now read responses aloud" 
        : "Text-to-speech has been turned off",
    });
  };
  
  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        {showIcon && <Volume2 className="h-4 w-4 text-blue-600" />}
        <Label htmlFor="tts-toggle" className="cursor-pointer">{label}</Label>
        <Switch
          id="tts-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={subscription.tier === 'free'}
        />
        
        {subscription.tier === 'free' && (
          <span className="text-xs text-gray-500 ml-2">(Plus/Pro)</span>
        )}
      </div>
      
      {/* Subscription upgrade dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              Text-to-Speech is available on Plus and Pro plans. Upgrade to enable this feature.
            </DialogDescription>
          </DialogHeader>
          <SubscriptionSelector 
            onClose={() => setShowUpgradeDialog(false)} 
            currentTier={subscription.tier} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TTSToggle;