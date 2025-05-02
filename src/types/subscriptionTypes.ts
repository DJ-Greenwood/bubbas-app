// /d:/Business/App_Bubba/bubbas-app/src/types/SubscriptionTiers.ts

export type SubscriptionTier = 'free' | 'plus' | 'pro';

export interface SubscriptionBenefits {
    chatsPerDay: number;
    tokensPerMonth: number;
    moodTracking: 'basic' | 'enhanced' | 'advanced';
    journalEntries: number | 'unlimited';
    premiumFeatures?: string[];
}

export const SubscriptionTiers: Record<SubscriptionTier, SubscriptionBenefits> = {
    free: {
        chatsPerDay: 10,
        tokensPerMonth: 10000,
        moodTracking: 'basic',
        journalEntries: 50,
    },
    plus: {
        chatsPerDay: 30,
        tokensPerMonth: 50000,
        moodTracking: 'enhanced',
        journalEntries: 500,
        premiumFeatures: ['Cross-device sync'],
    },
    pro: {
        chatsPerDay: 100,
        tokensPerMonth: 200000,
        moodTracking: 'advanced',
        journalEntries: 'unlimited',
        premiumFeatures: ['All premium features', 'Advanced AI insights'],
    },
};