import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';
import { SubscriptionTier } from '@/hooks/useSubscriptionLimits';

type SubscriptionUpgradeDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: SubscriptionTier;
  title?: string;
  description?: string;
};

const SubscriptionUpgradeDialog: React.FC<SubscriptionUpgradeDialogProps> = ({ 
  isOpen, 
  onOpenChange, 
  currentTier,
  title = "Upgrade Your Plan",
  description = "You've reached your daily chat limit. Upgrade your subscription to continue chatting with Bubba!"
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          <SubscriptionSelector 
            onClose={() => onOpenChange(false)} 
            currentTier={currentTier}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionUpgradeDialog;