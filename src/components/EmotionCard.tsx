// src/components/EmotionCard.tsx
import React from 'react';
import { colors, typography, spacing, borderRadius } from '@/styles/design-system';

interface EmotionCardProps {
  emotion: string;
  intensity: number;
  timestamp: string;
  note?: string;
  onClick?: () => void;
}

const EmotionCard: React.FC<EmotionCardProps> = ({
  emotion,
  intensity,
  timestamp,
  note,
  onClick
}) => {
  // Determine color based on emotion
  const getEmotionColor = (emotionName: string) => {
    const emotionMap: Record<string, string> = {
      'happy': colors.primary[500],
      'sad': colors.neutral[400],
      'angry': colors.error,
      'anxious': colors.warning,
      'calm': colors.info,
      // Add more emotions as needed
    };
    
    return emotionMap[emotionName.toLowerCase()] || colors.neutral[500];
  };
  
  // Inline styles using design system tokens
  const styles = {
    card: {
      backgroundColor: 'white',
      borderRadius: borderRadius.lg,
      padding: spacing[6],
      marginBottom: spacing[4],
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      borderLeft: `4px solid ${getEmotionColor(emotion)}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    cardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    emotion: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.neutral[800],
      marginBottom: spacing[2],
    },
    timestamp: {
      fontSize: typography.fontSize.sm,
      color: colors.neutral[500],
      marginBottom: spacing[4],
    },
    intensity: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: spacing[4],
    },
    intensityLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.neutral[600],
      marginRight: spacing[2],
    },
    intensityBar: {
      height: '6px',
      width: '100%',
      backgroundColor: colors.neutral[200],
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    intensityFill: {
      height: '100%',
      width: `${intensity * 10}%`,
      backgroundColor: getEmotionColor(emotion),
      borderRadius: borderRadius.full,
    },
    note: {
      fontSize: typography.fontSize.base,
      color: colors.neutral[700],
      lineHeight: typography.lineHeight.relaxed,
    },
  };
  
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <div 
      style={{
        ...styles.card,
        ...(isHovered && onClick ? styles.cardHover : {})
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.emotion}>{emotion}</div>
      <div style={styles.timestamp}>{timestamp}</div>
      
      <div style={styles.intensity}>
        <span style={styles.intensityLabel}>Intensity:</span>
        <div style={styles.intensityBar}>
          <div style={styles.intensityFill}></div>
        </div>
      </div>
      
      {note && <div style={styles.note}>{note}</div>}
    </div>
  );
};

export default EmotionCard;