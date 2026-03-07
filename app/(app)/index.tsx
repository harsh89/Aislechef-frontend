import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
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

  const { data: lists = [], isLoading, isError } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.get<GroceryList[]>('/lists'),
  });

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['lists'] });
    }, [qc]),
  );

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post<GroceryList>('/lists', { name }),
    onSuccess: (created) => {
      qc.setQueryData<GroceryList[]>(['lists'], (prev = []) => [created, ...prev]);
      setCreateVisible(false);
      setNewName('');
    },
    onError: () => Alert.alert('Error', 'Could not create list.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (listId: string) => api.delete(`/lists/${listId}`),
    onSuccess: (_, listId) => {
      qc.setQueryData<GroceryList[]>(['lists'], (prev = []) =>
        prev.filter((l) => l.listId !== listId),
      );
    },
    onError: () => Alert.alert('Error', 'Could not delete list.'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ listId, name }: { listId: string; name: string }) =>
      api.put<GroceryList>(`/lists/${listId}`, { name }),
    onSuccess: (updated) => {
      qc.setQueryData<GroceryList[]>(['lists'], (prev = []) =>
        prev.map((l) => (l.listId === updated.listId ? updated : l)),
      );
    },
    onError: () => Alert.alert('Error', 'Could not rename list.'),
  });

  function handleDelete(listId: string, name: string) {
    Alert.alert('Delete List', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(listId) },
    ]);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(name);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
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
              onRename={(name) => renameMutation.mutate({ listId: item.listId, name })}
            />
          )}
          contentContainerStyle={{ paddingVertical: spacing[2] }}
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
