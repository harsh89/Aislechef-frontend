import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { api, ApiError } from '../lib/api';
import { getDatabase } from '../lib/database';
import type { SyncList, SyncItem, SyncResponse } from '../types';

export function useSync(onConflict: () => void) {
  const wasOffline = useRef(false);

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
        await syncToServer(onConflict);
      } catch {
        // silently ignore sync errors
      }
    });

    return unsubscribe;
  }, [onConflict]);
}

async function syncToServer(onConflict: () => void) {
  const db = await getDatabase();

  const [lists, items] = await Promise.all([
    db.getAllAsync<SyncList & { synced: number }>(
      'SELECT listId, name, lastUpdated, isDeleted FROM lists WHERE synced = 0',
    ),
    db.getAllAsync<SyncItem & { synced: number }>(
      'SELECT itemId, listId, itemName, quantity, unit, lastUpdated, isDeleted FROM items WHERE synced = 0',
    ),
  ]);

  if (lists.length === 0 && items.length === 0) return;

  const response = await api.post<SyncResponse>('/sync', {
    lists: lists.map(({ ...l }) => ({ ...l, isDeleted: Boolean(l.isDeleted) })),
    items: items.map(({ ...i }) => ({ ...i, isDeleted: Boolean(i.isDeleted) })),
  });

  // Mark as synced
  await db.runAsync(
    `UPDATE lists SET synced = 1 WHERE listId IN (${lists.map(() => '?').join(',')})`,
    lists.map((l) => l.listId),
  );
  await db.runAsync(
    `UPDATE items SET synced = 1 WHERE itemId IN (${items.map(() => '?').join(',')})`,
    items.map((i) => i.itemId),
  );

  if (response.conflicts && response.conflicts.length > 0) {
    onConflict();
  }
}
