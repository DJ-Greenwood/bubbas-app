import React from 'react';

interface UsageStatusCardsProps {
  dailyUsage: number;
  dailyLimit: number;
  monthlyUsage: number;
  monthlyLimit: string | number;
  onUpgradeClick: () => void;
}

const UsageStatusCards: React.FC<UsageStatusCardsProps> = ({
  dailyUsage,
  dailyLimit,
  monthlyUsage,
  monthlyLimit,
  onUpgradeClick,
}) => {
  const formatNumber = (num: number | string) =>
    typeof num === 'number' ? num.toLocaleString() : num;

  return (
    <div>
      <div>
        <h3>Daily Chat Usage</h3>
        <p>
          {dailyUsage} / {dailyLimit}
        </p>
        <progress value={dailyUsage} max={dailyLimit}></progress>
      </div>
      <div>
        <h3>Monthly Token Usage</h3>
        <p>
          {formatNumber(monthlyUsage)} / {formatNumber(monthlyLimit)}
        </p>
        <progress
          value={typeof monthlyLimit === 'number' ? monthlyUsage : 0}
          max={typeof monthlyLimit === 'number' ? monthlyLimit : 1}
        ></progress>
      </div>
      <button onClick={onUpgradeClick}>Upgrade Plan</button>
    </div>
  );
};

export default UsageStatusCards;
