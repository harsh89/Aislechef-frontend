import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { localStore } from '../lib/localStore';
import type { SyncResponse } from '../types';

export function useSync(onConflict: () => void) {
  const wasOffline = useRef(false);
  const qc = useQueryClient();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const isOnline = state.isConnected === true;

      if (!isOnline) {
        wasOffline.current = true;
        return;
      }

      if (!wasOffline.current) return;
      wasOffline.current = false;

      try {
        await syncToServer(onConflict, qc);
      } catch {
        // silently ignore sync errors
      }
    });

    return unsubscribe;
  }, [onConflict, qc]);
}

async function syncToServer(onConflict: () => void, qc: QueryClient) {
  const [lists, items] = await Promise.all([
    localStore.getUnsyncedLists(),
    localStore.getUnsyncedItems(),
  ]);

  if (lists.length === 0 && items.length === 0) return;

  const response = await api.post<SyncResponse>('/sync', {
    lists: lists.map((l) => ({ ...l, isDeleted: Boolean(l.isDeleted) })),
    items: items.map((i) => ({
      ...i,
      isDeleted: Boolean(i.isDeleted),
      isCompleted: Boolean(i.isCompleted),
    })),
  });

  await localStore.markListsSynced(lists.map((l) => l.listId));
  await localStore.markItemsSynced(items.map((i) => i.itemId));

  // Invalidate React Query caches so screens reflect server truth
  qc.invalidateQueries({ queryKey: ['lists'] });
  qc.invalidateQueries({ queryKey: ['items'] });

  if (response.conflicts && response.conflicts.length > 0) {
    onConflict();
  }
}
