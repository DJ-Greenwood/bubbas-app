// src/components/dashboard/WordCloudAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { useConversationService } from '../../hooks/useConversationService';
import { useAuth } from '../../hooks/useAuth';

interface WordData {
  word: string;
  count: number;
  associatedEmotions: string[];
  lastUsed: any;
}

interface WordCloudProps {
  className?: string;
  selectedEmotion?: string;
  minCount?: number;
  maxWords?: number;
}

const WordCloudAnalytics: React.FC<WordCloudProps> = ({
  className = '',
  selectedEmotion,
  minCount = 2,
  maxWords = 50
}) => {
  const { user } = useAuth();
  const { loadWordFrequency } = useConversationService();
  const [words, setWords] = useState<WordData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Emotions that can be selected for filtering
  const emotions = [
    'happy', 'sad', 'anxious', 'calm', 'excited', 
    'frustrated', 'neutral', 'confused', 'hopeful', 
    'overwhelmed', 'grateful', 'angry', 'determined'
  ];

  // Load word frequency data
  useEffect(() => {
    const fetchWords = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const wordData = await loadWordFrequency({
          emotion: selectedEmotion,
          limit: maxWords,
          minCount
        });
        
        setWords(wordData);
      } catch (err) {
        console.error('Error loading word frequency:', err);
        setError('Failed to load word data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWords();
  }, [user, selectedEmotion, minCount, maxWords, loadWordFrequency]);
  
  // Get the highest count for scaling
  const maxCount = words.length > 0 
    ? Math.max(...words.map(word => word.count))
    : 0;
  
  // Function to calculate font size based on word count
  const getFontSize = (count: number) => {
    // Ensure minimum size of 14px, scale up to 48px based on word count
    const minSize = 14;
    const maxSize = 48;
    
    if (maxCount <= 1) return minSize;
    
    const size = minSize + ((count / maxCount) * (maxSize - minSize));
    return Math.round(size);
  };
  
  // Function to get color based on emotions
  const getWordColor = (emotions: string[]) => {
    if (!emotions.length) return 'text-gray-400';
    
    const emotionColorMap: { [key: string]: string } = {
      happy: 'text-yellow-500',
      sad: 'text-blue-400',
      anxious: 'text-purple-400',
      calm: 'text-teal-400',
      excited: 'text-orange-400',
      frustrated: 'text-red-500',
      neutral: 'text-gray-500',
      confused: 'text-indigo-400',
      hopeful: 'text-emerald-400',
      overwhelmed: 'text-pink-400',
      grateful: 'text-green-500',
      angry: 'text-red-600',
      determined: 'text-blue-600'
    };
    
    // Use the most common emotion for color
    const emotionCounts: { [key: string]: number } = {};
    emotions.forEach(emotion => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
    
    const mostCommonEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    return emotionColorMap[mostCommonEmotion] || 'text-gray-500';
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading word data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            className="mt-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className={`flex flex-col justify-center items-center h-64 ${className}`}>
        <p className="text-gray-500 text-center">
          {selectedEmotion 
            ? `No words found associated with "${selectedEmotion}" emotion.` 
            : "No words found. Start chatting to see your most used words."}
        </p>
        
        {selectedEmotion && (
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
            onClick={() => window.location.reload()}
          >
            View all words
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={`px-3 py-1 text-sm rounded-full transition ${
            !selectedEmotion ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
          onClick={() => window.location.href = window.location.pathname}
        >
          All
        </button>
        
        {emotions.map(emotion => (
          <button
            key={emotion}
            className={`px-3 py-1 text-sm rounded-full transition ${
              selectedEmotion === emotion ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => window.location.href = `${window.location.pathname}?emotion=${emotion}`}
          >
            {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
          </button>
        ))}
      </div>
      
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">
          {selectedEmotion 
            ? `Words Associated with "${selectedEmotion}" Emotion`
            : "Your Most Frequently Used Words"}
        </h2>
        
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 min-h-64">
          {words.map((wordData, index) => (
            <div 
              key={index}
              className={`${getWordColor(wordData.associatedEmotions)} hover:opacity-75 transition-opacity cursor-default`}
              style={{ fontSize: `${getFontSize(wordData.count)}px` }}
              title={`"${wordData.word}" used ${wordData.count} times • Associated emotions: ${wordData.associatedEmotions.join(', ')}`}
            >
              {wordData.word}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WordCloudAnalytics;