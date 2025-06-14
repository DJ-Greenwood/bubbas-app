'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/utils/firebaseClient';
import { setUserUID } from '@/utils/encryption';
import {
  getJournalEntries,
  editJournalEntry,
  softDeleteJournalEntry,
} from '@/utils/journalService';
import { useToast } from '@/hooks/use-toast';

import { JournalEntry } from '@/types/JournalEntry';
import JournalCard from '../JournalChat/Journal/JournalCard';

import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

import FlexRow from '@/components/ui/FlexRow';
import { GridContainer } from '../ui/GridContainer';
import { PageContainer } from '@/components/ui/PageContainer'; // ✅ ADDED
import { SectionContainer } from '@/components/ui/SectionContainer'; // ✅ ADDED

// UI components
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type DecryptedJournalEntry = JournalEntry & {
  userText?: string;
  bubbaReply?: string;
};

const ImprovedJournalPage = () => {
  const [entries, setEntries] = useState<DecryptedJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const entriesLoaded = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserUID(firebaseUser.uid);
      } else {
        setUser(null);
        router.push('/auth');
      }
    });
    return () => {
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (user && !entriesLoaded.current) {
      loadJournalEntries();
    }
  }, [user]);

  const loadJournalEntries = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const loaded = await getJournalEntries('active', user.uid);
      const sortedEntries = [...loaded].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEntries(sortedEntries);
      entriesLoaded.current = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError('Failed to load journal entries: ' + errorMessage);
      toast({
        title: 'Loading Error',
        description: 'Failed to load your journal entries. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (timestamp: string) => {
    try {
      if (!user) throw new Error('User not authenticated.');
      setEntries((prev) => prev.filter((entry) => entry.timestamp !== timestamp));
      await softDeleteJournalEntry(timestamp, user.uid);
      toast({
        title: 'Entry Moved to Trash',
        description: 'Journal entry has been moved to the trash.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError('Failed to delete entry: ' + errorMessage);
      entriesLoaded.current = false;
      loadJournalEntries();
      toast({
        title: 'Error',
        description: 'Failed to move entry to trash.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async (timestamp: string, newText: string) => {
    try {
      if (!user) throw new Error('User not authenticated.');
      await editJournalEntry(timestamp, newText, user.uid);
      entriesLoaded.current = false;
      await loadJournalEntries();
      toast({
        title: 'Entry Updated',
        description: 'Your journal entry has been updated successfully.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError('Failed to edit entry: ' + errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to update your journal entry.',
        variant: 'destructive',
      });
    }
  };

  const goToTrash = () => router.push('/Journal/trash');

  const handleRefresh = () => {
    entriesLoaded.current = false;
    loadJournalEntries();
  };

  if (loading && entries.length === 0) {
    return (
      <PageContainer>
        <SectionContainer>
          <FlexRow className="mb-6">
            <h1 className="text-2xl font-bold">Your Journal</h1>
            <div className="opacity-50">
              <Skeleton className="h-10 w-24" />
            </div>
          </FlexRow>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-40 rounded-lg mb-4" />
          ))}
        </SectionContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionContainer>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FlexRow className="mb-6">
          <h1 className="text-2xl font-bold">Your Journal</h1>
          <div className="flex gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToTrash}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Trash</span>
            </Button>
          </div>
        </FlexRow>

        {loading && entries.length > 0 && (
          <Alert className="mb-6">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
            <AlertTitle>Updating</AlertTitle>
            <AlertDescription>Refreshing your journal entries...</AlertDescription>
          </Alert>
        )}

        {!loading && entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You don't have any journal entries yet. Start chatting with Bubba to create some!
            </p>
            <Button onClick={() => router.push('/EmotionChat')} className="mt-2">
              Start New Chat
            </Button>
          </div>
        ) : (
          <GridContainer className="grid-cols-1">
            {entries.map((entry) => (
              <JournalCard
                key={entry.timestamp}
                entry={entry}
                onEdit={(newText) => handleEdit(entry.timestamp, newText)}
                onSoftDelete={() => handleSoftDelete(entry.timestamp)}
              />
            ))}
          </GridContainer>
        )}
      </SectionContainer>
    </PageContainer>
  );
};

export default ImprovedJournalPage;
