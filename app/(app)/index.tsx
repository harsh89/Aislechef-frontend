import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { localStore } from '../../lib/localStore';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { ListCard } from '../../components/features/lists/ListCard';
import type { GroceryList } from '../../types';

export default function ListsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors, spacing, radius, shadow } = useTheme();
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState('');

  // ── Seed cache from SQLite on first mount (instant display) ──────────────
  useEffect(() => {
    if (qc.getQueryData(['lists'])) return;
    localStore.getLists().then((locals) => {
      if (locals.length > 0) qc.setQueryData<GroceryList[]>(['lists'], locals);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch from server, merge in local unsynced lists ─────────────────────
  const { data: lists = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const serverLists = await api.get<GroceryList[]>('/lists');

      // Update SQLite with fresh server data (background, don't block render)
      Promise.all(
        serverLists.map((l) => localStore.upsertList({ ...l, isDeleted: false }, 1)),
      ).catch(() => {});

      // Merge in any local lists not yet on the server
      const unsynced = await localStore.getUnsyncedLists();
      const localNew = unsynced.filter(
        (l) => !l.isDeleted && !serverLists.some((s) => s.listId === l.listId),
      );

      if (localNew.length > 0) {
        const mapped: GroceryList[] = localNew.map((l) => ({
          listId: l.listId,
          name: l.name,
          lastUpdated: l.lastUpdated,
        }));
        return [...mapped, ...serverLists];
      }

      return serverLists;
    },
  });

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['lists'] });
    }, [qc]),
  );

  // ── Create list (offline-first) ───────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async ({ name, tempId }: { name: string; tempId: string }) => {
      const serverList = await api.post<GroceryList>('/lists', { name });
      await localStore.replaceListId(tempId, serverList);
      return { tempId, serverList };
    },
    onSuccess: ({ tempId, serverList }) => {
      qc.setQueryData<GroceryList[]>(['lists'], (prev = []) =>
        prev.map((l) => (l.listId === tempId ? serverList : l)),
      );
    },
    // No onError: local SQLite entry (synced=0) will sync on reconnect
  });

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const tempList: GroceryList = { listId: tempId, name, lastUpdated: now };

    // 1. Write to SQLite immediately (unsynced)
    await localStore.upsertList({ ...tempList, isDeleted: false }, 0);

    // 2. Optimistic cache update
    qc.setQueryData<GroceryList[]>(['lists'], (prev = []) => [tempList, ...prev]);

    setCreateVisible(false);
    setNewName('');

    // 3. Background API call
    createMutation.mutate({ name, tempId });
  }

  // ── Delete list (offline-first) ───────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (listId: string) => {
      await api.delete(`/lists/${listId}`);
      await localStore.markListsSynced([listId]);
    },
    // No onError: soft-deleted SQLite entry (synced=0) will sync on reconnect
  });

  function handleDelete(listId: string, name: string) {
    Alert.alert('Delete List', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Optimistic: remove from cache immediately
          qc.setQueryData<GroceryList[]>(['lists'], (prev = []) =>
            prev.filter((l) => l.listId !== listId),
          );
          // Soft-delete in SQLite (unsynced)
          await localStore.softDeleteList(listId);
          // Background API call
          deleteMutation.mutate(listId);
        },
      },
    ]);
  }

  // ── Rename list (offline-first) ───────────────────────────────────────────
  const renameMutation = useMutation({
    mutationFn: async ({ listId, name }: { listId: string; name: string }) => {
      // Update SQLite (unsynced)
      await localStore.updateList(listId, { name }, 0);
      // Try API
      const updated = await api.put<GroceryList>(`/lists/${listId}`, { name });
      await localStore.markListsSynced([listId]);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData<GroceryList[]>(['lists'], (prev = []) =>
        prev.map((l) => (l.listId === updated.listId ? updated : l)),
      );
    },
    onError: (_, { listId, name }) => {
      // SQLite was updated but API failed — stays unsynced (sync handles it)
      // Keep the local name in cache
      qc.setQueryData<GroceryList[]>(['lists'], (prev = []) =>
        prev.map((l) => (l.listId === listId ? { ...l, name } : l)),
      );
    },
  });

  function handleRename(listId: string, name: string) {
    // Optimistic cache update immediately
    qc.setQueryData<GroceryList[]>(['lists'], (prev = []) =>
      prev.map((l) => (l.listId === listId ? { ...l, name } : l)),
    );
    renameMutation.mutate({ listId, name });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ title: 'My Lists' }} />
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing[4], borderBottomColor: colors.border }]}>
        <Text variant="h2">My Lists</Text>
        <Button variant="ghost" size="sm" label="Sign out" onPress={handleSignOut} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text variant="body" muted>Failed to load lists.</Text>
        </View>
      ) : lists.length === 0 ? (
        <View style={styles.center}>
          <Text variant="body" muted>No lists yet. Tap + to create one.</Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.listId}
          renderItem={({ item }) => (
            <ListCard
              list={item}
              onPress={() => router.push(`/(app)/list/${item.listId}`)}
              onDelete={() => handleDelete(item.listId, item.name)}
              onRename={(name) => handleRename(item.listId, name)}
            />
          )}
          contentContainerStyle={{ paddingVertical: spacing[2] }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => setCreateVisible(true)}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: spacing[8],
            right: spacing[6],
            opacity: pressed ? 0.8 : 1,
            ...shadow.md,
          },
        ]}
      >
        <Text variant="h2" color={colors.primaryForeground}>+</Text>
      </Pressable>

      {/* Create List Modal */}
      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => setCreateVisible(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: spacing[6], margin: spacing[6] }]}
            onPress={() => {}}
          >
            <Text variant="h3" style={styles.mb16}>New List</Text>
            <TextInput
              placeholder="List name"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleCreate}
              style={[
                {
                  color: colors.text,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[3],
                  marginBottom: spacing[4],
                },
              ]}
            />
            <View style={styles.row}>
              <Button variant="secondary" label="Cancel" onPress={() => setCreateVisible(false)} />
              <Button label="Create" onPress={handleCreate} loading={createMutation.isPending} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'center' },
  sheet: {},
  mb16: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
});
