import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type LimitErrorAlertProps = {
  errorMessage: string | null;
  title?: string;
  onUpgradeClick?: () => void;
};

const LimitErrorAlert: React.FC<LimitErrorAlertProps> = ({ 
  errorMessage, 
  title = "Usage Limit Reached",
  onUpgradeClick
}) => {
  if (!errorMessage) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {errorMessage}
        {onUpgradeClick && (
          <button 
            onClick={onUpgradeClick}
            className="text-white underline ml-2"
          >
            Upgrade now
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default LimitErrorAlert;