// src/components/RecoveryModal.tsx
import React, { useState } from 'react';
import { recoverWithPassphrase, recoverWithCode } from '../utils/encryption';

interface RecoveryModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const RecoveryModal: React.FC<RecoveryModalProps> = ({ 
  isOpen, 
  onSuccess, 
  onCancel 
}) => {
  const [method, setMethod] = useState<'passphrase' | 'recoveryCode'>('passphrase');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let isValid = false;
      
      if (method === 'passphrase') {
        isValid = await recoverWithPassphrase(input);
      } else {
        isValid = await recoverWithCode(input);
      }
      
      if (isValid) {
        onSuccess();
      } else {
        setError(`Invalid ${method === 'passphrase' ? 'passphrase' : 'recovery code'}. Please try again.`);
      }
    } catch (err) {
      setError(`Error during recovery. Please try again.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Recover Account Access</h2>
        <p className="mb-4 text-gray-600">
          Your data is protected with encryption. Please enter your 
          {method === 'passphrase' ? ' passphrase' : ' recovery code'} to access your data.
        </p>
        
        <div className="flex space-x-2 mb-4">
          <button
            type="button"
            onClick={() => setMethod('passphrase')}
            className={`px-3 py-1 rounded ${
              method === 'passphrase' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Use Passphrase
          </button>
          <button
            type="button"
            onClick={() => setMethod('recoveryCode')}
            className={`px-3 py-1 rounded ${
              method === 'recoveryCode' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Use Recovery Code
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <input
            type={method === 'passphrase' ? 'password' : 'text'}
            className="w-full p-2 border rounded mb-4"
            placeholder={method === 'passphrase' ? 'Enter your passphrase' : 'Enter your recovery code (e.g., APPLE-BANANA-CHERRY-1234)'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
          />
          
          {error && <p className="text-red-500 mb-4">{error}</p>}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? 'Recovering...' : 'Recover Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecoveryModal;