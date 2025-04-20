import React from 'react';

interface UserProfileData {
  email: string;
  username?: string;
  phoneNumber?: string;
  createdAt: string;
  agreedTo: {
    terms: string;
    privacy: string;
    ethics: string;
  };
  preferences: {
    tone: string;
    theme: string;
    startPage: string;
  };
  usage: {
    tokens: {
      lifetime: number;
      monthly: { [key: string]: number };
    };
    voiceChars: {
      tts: {
        lifetime: number;
        monthly: { [key: string]: number };
      };
      stt: {
        lifetime: number;
        monthly: { [key: string]: number };
      };
    };
  };
  subscription: {
    tier: string;
    activationDate: string;
    expirationDate: string;
  };
  features: {
    memory: boolean;
    tts: boolean;
    stt: boolean;
    emotionalInsights: boolean;
  };
}

const UserProfile: React.FC<{ user: UserProfileData }> = ({ user }) => {
  return (
    <div className="bg-gray-100 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">User Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Personal Information Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Personal Information</h2>
            <p className="text-gray-700 mb-2"><strong>Email:</strong> {user.email}</p>
            {user.username && <p className="text-gray-700 mb-2"><strong>Username:</strong> {user.username}</p>}
            {user.phoneNumber && <p className="text-gray-700 mb-2"><strong>Phone Number:</strong> {user.phoneNumber}</p>}
            <p className="text-gray-700 mb-2"><strong>Created At:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>

          {/* Agreements Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Agreements</h2>
            <p className="text-gray-700 mb-2"><strong>Terms:</strong> {new Date(user.agreedTo.terms).toLocaleDateString()}</p>
            <p className="text-gray-700 mb-2"><strong>Privacy:</strong> {new Date(user.agreedTo.privacy).toLocaleDateString()}</p>
            <p className="text-gray-700 mb-2"><strong>Ethics:</strong> {new Date(user.agreedTo.ethics).toLocaleDateString()}</p>
          </div>

          {/* Preferences Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Preferences</h2>
            <p className="text-gray-700 mb-2"><strong>Tone:</strong> {user.preferences.tone}</p>
            <p className="text-gray-700 mb-2"><strong>Theme:</strong> {user.preferences.theme}</p>
            <p className="text-gray-700 mb-2"><strong>Start Page:</strong> {user.preferences.startPage}</p>
          </div>

          {/* Subscription Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Subscription Information</h2>
            <p className="text-gray-700 mb-2"><strong>Tier:</strong> {user.subscription.tier}</p>
            <p className="text-gray-700 mb-2">
              <strong>Activation Date:</strong> {new Date(user.subscription.activationDate).toLocaleDateString()}
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Expiration Date:</strong> {new Date(user.subscription.expirationDate).toLocaleDateString()}
            </p>
            <a href="/profile/transactions" className="text-blue-500 hover:underline">View Transaction History</a>
    
            {/* Features Card */}
            <div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Features</h3>
              <p className="text-gray-700 mb-2"><strong>Memory:</strong> {user.features.memory ? 'Enabled' : 'Disabled'}</p>
              <p className="text-gray-700 mb-2"><strong>TTS:</strong> {user.features.tts ? 'Enabled' : 'Disabled'}</p>
              <p className="text-gray-700 mb-2"><strong>STT:</strong> {user.features.stt ? 'Enabled' : 'Disabled'}</p>
              <p className="text-gray-700 mb-2"><strong>Emotional Insights:</strong> {user.features.emotionalInsights ? 'Enabled' : 'Disabled'}</p>
              
            </div>

        
            {/* Usage Card */}
            <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Usage</h3>
            <p className="text-gray-700 mb-2"><strong>Lifetime Tokens Used:</strong> {user.usage.tokens.lifetime}</p>
            {Object.entries(user.usage.tokens.monthly).length > 0 && (
              <>
                <h4 className="text-xl font-semibold text-gray-800 mt-4 mb-2">Monthly Tokens Used:</h4>
                <ul className="list-disc list-inside text-gray-700">
                  {Object.entries(user.usage.tokens.monthly).map(([month, tokens]) => (
                    <li key={month}>
                      Month {parseInt(month) + 1}: {tokens}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="text-gray-700 mt-4 mb-2"><strong>Lifetime TTS Minutes Used:</strong> {user.usage.voiceChars.tts.lifetime}</p>
            {Object.entries(user.usage.voiceChars.tts.monthly).length > 0 && (
              <>
                <h4 className="text-xl font-semibold text-gray-800 mt-4 mb-2">Monthly TTS Minutes Used:</h4>
                <ul className="list-disc list-inside text-gray-700">
                  {Object.entries(user.usage.voiceChars.tts.monthly).map(([month, minutes]) => (
                    <li key={month}>
                      Month {parseInt(month) + 1}: {minutes}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="text-gray-700 mt-4 mb-2"><strong>Lifetime STT Minutes Used:</strong> {user.usage.voiceChars.stt.lifetime}</p>
            {Object.entries(user.usage.voiceChars.stt.monthly).length > 0 && (
              <>
                <h4 className="text-xl font-semibold text-gray-800 mt-4 mb-2">Monthly STT Minutes Used:</h4>
                <ul className="list-disc list-inside text-gray-700">
                  {Object.entries(user.usage.voiceChars.stt.monthly).map(([month, minutes]) => (
                    <li key={month}>
                      Month {parseInt(month) + 1}: {minutes}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>

);
};
export default UserProfile;