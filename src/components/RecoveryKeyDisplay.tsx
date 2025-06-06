// src/components/RecoveryKeyDisplay.tsx
import React, { useState } from 'react';

interface RecoveryKeyDisplayProps {
  recoveryKey: string;
  onContinue: () => void;
}

const RecoveryKeyDisplay: React.FC<RecoveryKeyDisplayProps> = ({
  recoveryKey,
  onContinue,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(recoveryKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h2 className="text-xl font-bold mb-4">Save Your Recovery Key</h2>

      <p className="mb-4 text-gray-600">
        Your data is protected with end-to-end encryption. If you ever forget your
        encryption key, you can use this recovery key to access your data.
      </p>

      <div className="bg-yellow-50 border border-yellow-400 p-4 rounded-md mb-6">
        <p className="font-bold text-yellow-800 mb-2">IMPORTANT:</p>
        <p className="text-yellow-800 mb-2">
          Write down this key and keep it in a safe place. We cannot reset or recover
          your data without it.
        </p>
        <p className="text-yellow-800">
          Do not share this code with anyone.
        </p>
      </div>

      <div className="bg-gray-100 p-3 rounded-md text-center mb-4 flex items-center justify-between">
        <p className="font-mono text-xl tracking-wider select-all">{recoveryKey}</p>
        <button
          type="button"
          onClick={copyToClipboard}
          className="ml-4 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="flex items-center mb-6">
        <input
          type="checkbox"
          id="confirm-checkbox"
          checked={confirmed}
          onChange={() => setConfirmed(!confirmed)}
          className="mr-2"
        />
        <label htmlFor="confirm-checkbox" className="text-sm">
          I have saved my recovery key in a safe place
        </label>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onContinue}
          disabled={!confirmed}
          className={`px-4 py-2 rounded ${
            confirmed
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default RecoveryKeyDisplay;
