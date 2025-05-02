// src/components/debug/EmotionDebug.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Emotion } from '@/components/emotion/emotionAssets';
import { EmotionCharacterKey, EmotionCharacters } from '@/types/emotionCharacters';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';

const EmotionDebug = () => {
  const { characterSet, emotionIconSize } = useEmotionSettings();
  const [imageLoads, setImageLoads] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(false);
  
  const emotions: Emotion[] = [
    "joyful", "peaceful", "tired", "nervous", "frustrated",
    "grateful", "hopeful", "isolated", "confused", "reflective",
    "sad", "angry"
  ];
  
  const allCharacterSets: EmotionCharacterKey[] = ['bubba', 'charlie', 'rusty'];
  
  const testImageUrl = (character: EmotionCharacterKey, emotion: Emotion) => {
    const { fileName } = EmotionCharacters[character];
    return `/assets/images/emotions/${fileName}/${emotion}.jpg`;
  };
  
  useEffect(() => {
    // Test if images exist
    const loadTests: Record<string, boolean> = {};
    
    // Test all emotions with all character sets
    allCharacterSets.forEach(character => {
      emotions.forEach(emotion => {
        const url = testImageUrl(character, emotion);
        const img = new Image();
        img.onload = () => {
          loadTests[`${character}-${emotion}`] = true;
          setImageLoads(prev => ({...prev, [`${character}-${emotion}`]: true}));
        };
        img.onerror = () => {
          loadTests[`${character}-${emotion}`] = false;
          setImageLoads(prev => ({...prev, [`${character}-${emotion}`]: false}));
        };
        img.src = url;
      });
    });
  }, []);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white shadow-lg rounded-lg p-4 border border-gray-200 max-w-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-gray-700">Emotion Image Debug</h3>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <div className="mb-2">
        <p className="text-sm">
          <strong>Current Settings:</strong> Character Set: {characterSet}, Icon Size: {emotionIconSize}px
        </p>
      </div>
      
      {expanded && (
        <div className="max-h-96 overflow-auto">
          <h4 className="font-medium mb-2">Image Load Tests:</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {allCharacterSets.map(character => (
              <div key={character} className="border rounded p-2">
                <h5 className="font-medium mb-1 capitalize">{character}</h5>
                <ul>
                  {emotions.map(emotion => (
                    <li key={emotion} className="flex justify-between">
                      <span>{emotion}:</span>
                      {imageLoads[`${character}-${emotion}`] === undefined ? (
                        <span>Testing...</span>
                      ) : imageLoads[`${character}-${emotion}`] ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Path Tests:</h4>
            <div className="grid grid-cols-1 gap-2">
              {emotions.map(emotion => (
                <div key={emotion} className="border rounded p-2">
                  <p className="font-medium mb-1">{emotion}</p>
                  <div className="text-xs overflow-x-auto">
                    <p>Path: {testImageUrl(characterSet, emotion)}</p>
                    <div className="mt-2">
                      <img 
                        src={testImageUrl(characterSet, emotion)} 
                        alt={emotion}
                        className="h-8 w-8 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.border = '2px solid red';
                          (e.target as HTMLImageElement).style.opacity = '0.5';
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionDebug;