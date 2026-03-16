import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
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
import { api } from '../../../lib/api';
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
  } = useInfiniteQuery({
    queryKey: ['items', listId],
    queryFn: ({ pageParam = 1 }) =>
      api.get<ListDetailResponse>(`/lists/${listId}?page=${pageParam}&limit=${LIMIT}`),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
    initialPageParam: 1,
    enabled: !searchQuery,
  });

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

  // ── Add item ──────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: ({
      itemName,
      quantity,
      unit,
    }: {
      itemName: string;
      quantity: number;
      unit: Unit;
    }) =>
      api.post<GroceryItem>(`/lists/${listId}/items`, { itemName, quantity, unit }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', listId] });
    },
    onError: () => Alert.alert('Error', 'Could not add item.'),
  });

  // ── Update item ───────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({
      itemId,
      itemName,
      quantity,
      unit,
    }: {
      itemId: string;
      itemName: string;
      quantity: number;
      unit: Unit;
    }) =>
      api.put<GroceryItem>(`/lists/${listId}/items/${itemId}`, {
        itemName,
        quantity,
        unit,
      }),
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

  // ── Delete item ───────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) =>
      api.delete(`/lists/${listId}/items/${itemId}`),
    onSuccess: (_, itemId) => {
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
    },
    onError: () => Alert.alert('Error', 'Could not delete item.'),
  });

  // ── Toggle item complete ───────────────────────────────────────────────────
  const completeMutation = useMutation({
    mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
      api.put<GroceryItem>(`/lists/${listId}/items/${itemId}`, { isCompleted }),
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

  // ── Reset completed items ─────────────────────────────────────────────────
  const resetMutation = useMutation({
    mutationFn: () => api.post(`/lists/${listId}/items/reset-completed`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', listId] });
    },
    onError: () => Alert.alert('Error', 'Could not reset items.'),
  });

  // ── Rename list ───────────────────────────────────────────────────────────
  const renameMutation = useMutation({
    mutationFn: (name: string) =>
      api.put<GroceryList>(`/lists/${listId}`, { name }),
    onSuccess: (updated) => {
      qc.setQueryData(['list-meta', listId], updated);
      qc.setQueryData<GroceryList[]>(['lists'], (prev = []) =>
        prev.map((l) => (l.listId === listId ? { ...l, name: updated.name } : l)),
      );
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  function commitTitleRename() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== listMeta?.name) renameMutation.mutate(trimmed);
    setEditingTitle(false);
  }

  async function handleAddItem(itemName: string, quantity: number, unit: Unit) {
    await addMutation.mutateAsync({ itemName, quantity, unit });
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
              onToggleComplete={() =>
                completeMutation.mutate({ itemId: item.itemId, isCompleted: !item.isCompleted })
              }
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
