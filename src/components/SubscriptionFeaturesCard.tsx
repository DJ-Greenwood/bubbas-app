import React from 'react';

interface SubscriptionFeaturesCardProps {
  tierName: string;
  features: string[];
  onUpgradeClick: () => void;
}

const SubscriptionFeaturesCard: React.FC<SubscriptionFeaturesCardProps> = ({
  tierName,
  features,
  onUpgradeClick,
}) => {
  return (
    <div>
      <h2>{tierName} Plan Features</h2>
      <ul>
        {features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
      <button onClick={onUpgradeClick}>Upgrade Plan</button>
    </div>
  );
};

export default SubscriptionFeaturesCard;
