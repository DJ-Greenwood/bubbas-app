'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth'); // ⛔ Redirect to login if not authenticated
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return <>{children}</>;
}
