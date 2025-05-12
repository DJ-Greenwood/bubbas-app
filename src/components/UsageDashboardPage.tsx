import React from 'react';
import UsageStatusCards from './UsageStatusCards';
import SubscriptionFeaturesCard from './SubscriptionFeaturesCard';

const UsageDashboardPage: React.FC = () => {
  const handleUpgradeClick = () => {
    console.log('Upgrade button clicked');
  };

  const subscriptionData = {
    tierName: 'Plus',
    features: [
      'Extended Chat Sessions',
      'Enhanced Mood Tracking & Daily Reflections',
      'Memory Sync Across Devices',
    ],
    dailyUsage: 15,
    dailyLimit: 30,
    monthlyUsage: 25000,
    monthlyLimit: 50000,
  };

  return (
    <div>
      <UsageStatusCards
        dailyUsage={subscriptionData.dailyUsage}
        dailyLimit={subscriptionData.dailyLimit}
        monthlyUsage={subscriptionData.monthlyUsage}
        monthlyLimit={subscriptionData.monthlyLimit}
        onUpgradeClick={handleUpgradeClick}
      />
      <SubscriptionFeaturesCard
        tierName={subscriptionData.tierName}
        features={subscriptionData.features}
        onUpgradeClick={handleUpgradeClick}
      />
    </div>
  );
};

export default UsageDashboardPage;
