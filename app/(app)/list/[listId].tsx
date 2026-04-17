import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import * as Crypto from 'expo-crypto';
import { api } from '../../../lib/api';
import { localStore } from '../../../lib/localStore';
import { useTheme } from '../../../hooks/useTheme';
import { Text } from '../../../components/ui/Text';
import { ItemRow } from '../../../components/features/items/ItemRow';
import { AddItemSheet } from '../../../components/features/items/AddItemSheet';
import type {
  GroceryItem,
  GroceryList,
  ListDetailResponse,
  SearchResponse,
  Unit,
} from '../../../types';

const LIMIT = 20;

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { colors, spacing, radius } = useTheme();

  const addSheetRef = useRef<BottomSheet>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // ── Seed cache from SQLite on first mount (instant display) ──────────────
  useEffect(() => {
    if (qc.getQueryData(['items', listId])) return;
    localStore.getItems(listId).then((localItems) => {
      if (!localItems.length) return;
      const now = new Date().toISOString();
      qc.setQueryData(['items', listId], {
        pages: [
          {
            listId,
            name: '',
            lastUpdated: now,
            items: localItems,
            pagination: {
              page: 1,
              limit: localItems.length,
              total: localItems.length,
              totalPages: 1,
            },
          },
        ],
        pageParams: [1],
      });
    });
  }, [listId]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['list-meta', listId] });
      qc.invalidateQueries({ queryKey: ['items', listId] });
    }, [qc, listId]),
  );

  // ── List metadata (name) ──────────────────────────────────────────────────
  const { data: listMeta } = useQuery({
    queryKey: ['list-meta', listId],
    queryFn: () =>
      api
        .get<ListDetailResponse>(`/lists/${listId}?page=1&limit=1`)
        .then((r) => ({ listId: r.listId, name: r.name, lastUpdated: r.lastUpdated })),
  });

  // ── Infinite items query ──────────────────────────────────────────────────
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['items', listId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get<ListDetailResponse>(
        `/lists/${listId}?page=${pageParam}&limit=${LIMIT}`,
      );
      // Update SQLite with server items (background)
      Promise.all(response.items.map((item) => localStore.upsertItem(item, 1))).catch(() => {});
      return response;
    },
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
    initialPageParam: 1,
    enabled: !searchQuery,
  });

  // ── Merge back any local-only unsynced items after server fetch ───────────
  useEffect(() => {
    if (!infiniteData) return;
    localStore.getUnsyncedItems().then((unsynced) => {
      const serverIds = new Set(
        infiniteData.pages.flatMap((p) => p.items.map((i) => i.itemId)),
      );
      const localNew = unsynced.filter(
        (i) => i.listId === listId && !i.isDeleted && !serverIds.has(i.itemId),
      );
      if (!localNew.length) return;

      const mapped: GroceryItem[] = localNew.map((i) => ({
        itemId: i.itemId,
        listId: i.listId,
        itemName: i.itemName,
        quantity: i.quantity,
        unit: i.unit as Unit,
        lastUpdated: i.lastUpdated,
        isDeleted: Boolean(i.isDeleted),
        isCompleted: Boolean(i.isCompleted),
      }));

      qc.setQueryData(['items', listId], (old: typeof infiniteData) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, idx) =>
            idx === 0 ? { ...page, items: [...mapped, ...page.items] } : page,
          ),
        };
      });
    });
  }, [infiniteData, listId, qc]);

  const items = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.items) ?? [],
    [infiniteData],
  );

  // ── Search query ──────────────────────────────────────────────────────────
  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['search', listId, searchQuery],
    queryFn: () =>
      api.get<SearchResponse>(`/lists/${listId}/search?q=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.length > 0,
    staleTime: 0,
  });

  const baseItems: GroceryItem[] = searchQuery ? (searchData?.results ?? []) : items;

  const displayItems = useMemo(
    () =>
      [...baseItems].sort((a, b) => {
        if (!!a.isCompleted === !!b.isCompleted) return 0;
        return a.isCompleted ? 1 : -1;
      }),
    [baseItems],
  );

  // ── Add item (offline-first) ──────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async ({
      itemName,
      quantity,
      unit,
      tempId,
    }: {
      itemName: string;
      quantity: number;
      unit: Unit;
      tempId: string;
    }) => {
      const serverItem = await api.post<GroceryItem>(`/lists/${listId}/items`, {
        itemName,
        quantity,
        unit,
      });
      await localStore.replaceItemId(tempId, serverItem);
      return { tempId, serverItem };
    },
    onSuccess: ({ tempId, serverItem }) => {
      qc.setQueryData(['items', listId], (old: typeof infiniteData) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((i) => (i.itemId === tempId ? serverItem : i)),
          })),
        };
      });
    },
    // No onError: SQLite entry stays unsynced, sync handles it on reconnect
  });

  async function handleAddItem(itemName: string, quantity: number, unit: Unit) {
    const tempId = Crypto.randomUUID();
    const now = new Date().toISOString();
    const tempItem: GroceryItem = {
      itemId: tempId,
      listId,
      itemName,
      quantity,
      unit,
      lastUpdated: now,
      createdAt: now,
      isDeleted: false,
      isCompleted: false,
    };

    // 1. Write to SQLite immediately (unsynced)
    await localStore.upsertItem(tempItem, 0);

    // 2. Optimistic cache update
    qc.setQueryData(['items', listId], (old: typeof infiniteData) => {
      const newPage = {
        listId,
        name: listMeta?.name ?? '',
        lastUpdated: now,
        items: [tempItem],
        pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
      };
      if (!old) return { pages: [newPage], pageParams: [1] };
      return {
        ...old,
        pages: old.pages.map((page, idx) =>
          idx === 0 ? { ...page, items: [tempItem, ...page.items] } : page,
        ),
      };
    });

    // 3. Background API call (fire-and-forget — sheet closes immediately)
    addMutation.mutate({ itemName, quantity, unit, tempId });
  }

  // ── Update item (offline-first) ───────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({
      itemId,
      itemName,
      quantity,
      unit,
    }: {
      itemId: string;
      itemName: string;
      quantity: number;
      unit: Unit;
    }) => {
      const patch = { itemName, quantity, unit };
      await localStore.updateItem(itemId, patch, 0);
      const updated = await api.put<GroceryItem>(`/lists/${listId}/items/${itemId}`, patch);
      await localStore.markItemsSynced([itemId]);
      return updated;
    },
    onMutate: async ({ itemId, itemName, quantity, unit }) => {
      qc.setQueryData(['items', listId], (old: typeof infiniteData) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((i) =>
              i.itemId === itemId ? { ...i, itemName, quantity, unit } : i,
            ),
          })),
        };
      });
    },
    onSuccess: (updated) => {
      qc.setQueryData(['items', listId], (old: typeof infiniteData) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((i) => (i.itemId === updated.itemId ? updated : i)),
          })),
        };
      });
    },
    onError: () => Alert.alert('Error', 'Could not update item.'),
  });

  // ── Delete item (offline-first) ───────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // Soft-delete in SQLite (unsynced)
      await localStore.softDeleteItem(itemId);
      // Remove from cache immediately
      qc.setQueryData(['items', listId], (old: typeof infiniteData) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((i) => i.itemId !== itemId),
          })),
        };
      });
      // Background API call
      await api.delete(`/lists/${listId}/items/${itemId}`);
      await localStore.markItemsSynced([itemId]);
    },
    // No onError: soft-delete stays in SQLite, sync handles it
  });

  // ── Toggle item complete (debounced optimistic, offline-first) ────────────
  const completeMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      const updated = await api.put<GroceryItem>(`/lists/${listId}/items/${itemId}`, {
        isCompleted,
      });
      await localStore.markItemsSynced([itemId]);
      return updated;
    },
  });

  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  function handleToggleComplete(item: GroceryItem) {
    const newIsCompleted = !item.isCompleted;

    // 1. Optimistic cache update immediately
    qc.setQueryData(['items', listId], (old: typeof infiniteData) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((i) =>
            i.itemId === item.itemId ? { ...i, isCompleted: newIsCompleted } : i,
          ),
        })),
      };
    });

    // 2. Write to SQLite immediately (unsynced)
    localStore.updateItem(item.itemId, { isCompleted: newIsCompleted }, 0).catch(() => {});

    // 3. Debounce the API call
    const existing = debounceTimers.current.get(item.itemId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      debounceTimers.current.delete(item.itemId);
      try {
        await completeMutation.mutateAsync({ itemId: item.itemId, isCompleted: newIsCompleted });
      } catch {
        // Network error: SQLite has the update (unsynced), sync handles it on reconnect
      }
    }, 600);

    debounceTimers.current.set(item.itemId, timer);
  }

  // ── Reset completed items (offline-first) ─────────────────────────────────
  const resetMutation = useMutation({
    mutationFn: async () => {
      // Get completed item IDs from cache
      const currentData = qc.getQueryData<typeof infiniteData>(['items', listId]);
      const completedIds =
        currentData?.pages.flatMap((p) =>
          p.items.filter((i) => i.isCompleted).map((i) => i.itemId),
        ) ?? [];

      // Update SQLite for each (unsynced)
      await Promise.all(
        completedIds.map((id) => localStore.updateItem(id, { isCompleted: false }, 0)),
      );

      // Optimistic cache update
      qc.setQueryData(['items', listId], (old: typeof infiniteData) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((i) => ({ ...i, isCompleted: false })),
          })),
        };
      });

      // Background API call
      await api.post(`/lists/${listId}/items/reset-completed`, {});
      await localStore.markItemsSynced(completedIds);
    },
    onError: () => Alert.alert('Error', 'Could not reset items.'),
  });

  // ── Rename list (offline-first) ───────────────────────────────────────────
  const renameMutation = useMutation({
    mutationFn: async (name: string) => {
      await localStore.updateList(listId, { name }, 0);
      const updated = await api.put<GroceryList>(`/lists/${listId}`, { name });
      await localStore.markListsSynced([listId]);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(['list-meta', listId], updated);
      qc.setQueryData<GroceryList[]>(['lists'], (prev = []) =>
        prev.map((l) => (l.listId === listId ? { ...l, name: updated.name } : l)),
      );
    },
  });

  function commitTitleRename() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== listMeta?.name) renameMutation.mutate(trimmed);
    setEditingTitle(false);
  }

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function navigateToRecipe() {
    router.push({
      pathname: '/(app)/recipe/',
      params: { listId },
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const listName = listMeta?.name ?? '';

  const ListFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={[styles.footerLoader, { paddingVertical: spacing[4] }]}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  };

  const ListEmpty = () => {
    if (isLoading || searching) return null;
    return (
      <View style={[styles.emptyState, { paddingTop: spacing[12] }]}>
        <Text variant="body" muted>
          {searchQuery ? 'No items match your search.' : 'No items yet. Tap + Add Item below.'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: listName,
          headerShown: true,
          headerTitle: () =>
            editingTitle ? (
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                onBlur={commitTitleRename}
                onSubmitEditing={commitTitleRename}
                autoFocus
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: '600',
                  minWidth: 160,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.primary,
                }}
              />
            ) : (
              <Pressable onPress={() => { setTitleDraft(listName); setEditingTitle(true); }}>
                <Text variant="h3" numberOfLines={1}>{listName}</Text>
              </Pressable>
            ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginRight: spacing[1] }}>
              {items.some((i) => i.isCompleted) && (
                <Pressable onPress={() => resetMutation.mutate()} disabled={resetMutation.isPending} hitSlop={8}>
                  {resetMutation.isPending
                    ? <ActivityIndicator size="small" color={colors.textMuted} />
                    : <Text variant="small" color={colors.textMuted}>Reset</Text>}
                </Pressable>
              )}
              <Pressable onPress={navigateToRecipe} hitSlop={8}>
                <Text variant="small" color={colors.primary}>Recipe</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[2],
          },
        ]}
      >
        <TextInput
          placeholder="Search items…"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 15,
            height: 36,
          }}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Text variant="small" color={colors.primary}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Background fetch indicator */}
      {isFetching && !isLoading && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginVertical: spacing[2] }}
        />
      )}

      {/* Items list */}
      {isLoading && !searchQuery ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text variant="body" muted>Failed to load items.</Text>
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.itemId}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              isCompleted={!!item.isCompleted}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === item.itemId}
              onToggleComplete={() => handleToggleComplete(item)}
              onUpdate={async (patch) => {
                await updateMutation.mutateAsync({ itemId: item.itemId, ...patch });
              }}
              onDelete={() => deleteMutation.mutate(item.itemId)}
            />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          keyboardShouldPersistTaps="handled"
          style={styles.flex}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Add Item bar */}
      <Pressable
        onPress={() => addSheetRef.current?.expand()}
        style={[
          styles.addBar,
          {
            backgroundColor: colors.surfaceRaised,
            borderTopColor: colors.border,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[4],
          },
        ]}
      >
        <Text variant="bodyMd" color={colors.primary}>+ Add Item</Text>
      </Pressable>

      {/* Add Item bottom sheet */}
      <AddItemSheet sheetRef={addSheetRef} onAdd={handleAddItem} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  footerLoader: { alignItems: 'center' },
  emptyState: { alignItems: 'center' },
  addBar: { borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
});
