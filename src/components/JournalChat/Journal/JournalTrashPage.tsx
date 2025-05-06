'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JournalEntry } from '@/types/JournalEntry';
import JournalCard from './JournalCard';
import { auth } from '@/utils/firebaseClient';
import { setUserUID } from '@/utils/encryption'; // Only import setUserUID from encryption.ts
import { getJournalEntries, recoverJournalEntry, hardDeleteJournalEntry } from '@/utils/firebaseDataService'; // Import database functions from firebaseDataService.ts
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const UpdatedJournalTrashPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserUID(user.uid);
      loadTrashEntries();
    } else {
      setError('User not authenticated');
      setLoading(false);
    }
  }, []);

  const loadTrashEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const trashedEntries = await getJournalEntries('trash');
      setEntries(trashedEntries);
    } catch (err) {
      console.error('Failed to load trashed entries:', err);
      setError('Failed to load trashed entries');
      toast({
        title: "Error",
        description: "Failed to load trash entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (timestamp: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        return;
      }

      setEntries(prev => prev.filter(entry => entry.timestamp !== timestamp));
      await recoverJournalEntry(timestamp, user.uid);

      toast({
        title: "Entry Restored",
        description: "The journal entry has been restored successfully.",
      });
    } catch (error) {
      console.error('Failed to restore entry:', error);
      loadTrashEntries();
      toast({
        title: "Error",
        description: "Failed to restore the entry.",
        variant: "destructive"
      });
    }
  };

  const handleHardDelete = async (timestamp: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        return;
      }

      setEntries(prev => prev.filter(entry => entry.timestamp !== timestamp));
      await hardDeleteJournalEntry(timestamp, user.uid);

      setConfirmDelete(null);
      toast({
        title: "Entry Deleted",
        description: "The journal entry has been permanently deleted.",
      });
    } catch (error) {
      console.error('Failed to permanently delete entry:', error);
      loadTrashEntries();
      toast({
        title: "Error",
        description: "Failed to delete the entry.",
        variant: "destructive"
      });
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const deletePromises = entries.map(entry => hardDeleteJournalEntry(entry.timestamp, user.uid));
      await Promise.all(deletePromises);

      setEntries([]);
      setConfirmDeleteAll(false);

      toast({
        title: "Trash Emptied",
        description: "All items in trash have been permanently deleted.",
      });
    } catch (error) {
      console.error('Failed to empty trash:', error);
      loadTrashEntries();
      toast({
        title: "Error",
        description: "Failed to empty the trash.",
        variant: "destructive"
      });
    }
  };

  const goToJournal = () => {
    router.push('/Journal');
  };

  if (loading) {
    return <div className="text-center py-8">Loading your trash...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button onClick={goToJournal} className="text-blue-500 hover:text-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Trash</h1>
        </div>

        {entries.length > 0 && (
          <button onClick={() => setConfirmDeleteAll(true)} className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors" title="Empty Trash">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-center py-8 text-gray-500">
          Your trash is empty.
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.timestamp} className="relative">
              <JournalCard
                entry={entry}
                onRestore={() => handleRestore(entry.timestamp)}
                onHardDelete={() => setConfirmDelete(entry.timestamp)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Permanent Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleHardDelete(confirmDelete)}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Empty Trash Dialog */}
      <Dialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Empty Trash</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete ALL items in the trash? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteAll(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleEmptyTrash}>Empty Trash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpdatedJournalTrashPage;