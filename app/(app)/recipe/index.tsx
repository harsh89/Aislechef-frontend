import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../../lib/api';
import { useTheme } from '../../../hooks/useTheme';
import { Text } from '../../../components/ui/Text';
import { Separator } from '../../../components/ui/Separator';
import { RecipeCard } from '../../../components/features/recipe/RecipeCard';
import { IngredientDiff } from '../../../components/features/recipe/IngredientDiff';
import { CUISINES } from '../../../types';
import type {
  CuisineFilter,
  GroceryItem,
  ReccoResponse,
  RecipeIngredient,
  ListDetailResponse,
} from '../../../types';

const LIMIT = 100; // load all for diff purposes

export default function RecipeScreen() {
  const { listId, selectedItemIds: rawIds } = useLocalSearchParams<{
    listId: string;
    selectedItemIds: string;
  }>();
  const selectedItemIds: string[] = rawIds ? JSON.parse(rawIds) : [];

  const { colors, spacing, radius, shadow } = useTheme();
  const [cuisine, setCuisine] = useState<CuisineFilter | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  // Load all local items for ingredient diff
  const { data: listData } = useInfiniteQuery({
    queryKey: ['items', listId, 'all'],
    queryFn: ({ pageParam = 1 }) =>
      api.get<ListDetailResponse>(`/lists/${listId}?page=${pageParam}&limit=${LIMIT}`),
    getNextPageParam: (last) =>
      last?.pagination && last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    initialPageParam: 1,
  });
  const localItems: GroceryItem[] = listData?.pages.flatMap((p) => p.items) ?? [];

  // Recco mutation
  const reccoMutation = useMutation({
    mutationFn: (cuisineFilter: CuisineFilter) =>
      api.post<ReccoResponse>('/recco', {
        listId,
        cuisineFilter,
        selectedItemIds,
      }),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 429) {
        Alert.alert('Rate limit', "You've reached today's limit (10 requests).");
      } else {
        Alert.alert('Error', 'Could not generate recipes. Please try again.');
      }
    },
  });

  function handleCuisineSelect(c: CuisineFilter) {
    setCuisine(c);
    reccoMutation.mutate(c);
  }

  async function handleAddToList(ingredient: RecipeIngredient) {
    const key = `${ingredient.name}-0`;
    setAddingIds((prev) => new Set(prev).add(key));
    try {
      await api.post(`/lists/${listId}/items`, {
        itemName: ingredient.name,
        quantity: ingredient.quantity || 1,
        unit: ingredient.unit || 'pcs',
      });
    } catch {
      Alert.alert('Error', `Could not add ${ingredient.name} to list.`);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  const recipes = reccoMutation.data?.recipes ?? [];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Create Recipe', headerShown: true }} />

      <ScrollView contentContainerStyle={{ paddingBottom: spacing[8] }} keyboardShouldPersistTaps="handled">
        {/* Cuisine picker */}
        <View style={[styles.cuisineSection, { padding: spacing[4] }]}>
          <Text variant="bodyMd" style={{ marginBottom: spacing[3] }}>Select a cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
            {CUISINES.map((c) => {
              const isSelected = cuisine === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => handleCuisineSelect(c)}
                  disabled={reccoMutation.isPending}
                  style={({ pressed }) => [
                    styles.cuisinePill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.secondary,
                      borderRadius: radius.full,
                      paddingVertical: spacing[2],
                      paddingHorizontal: spacing[4],
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    variant="small"
                    color={isSelected ? colors.primaryForeground : colors.secondaryForeground}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <Separator />

        {/* Loading */}
        {reccoMutation.isPending && (
          <View style={[styles.center, { paddingVertical: spacing[16] }]}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text variant="body" muted style={{ marginTop: spacing[4] }}>
              Generating recipes…
            </Text>
          </View>
        )}

        {/* Error state */}
        {reccoMutation.isError && !reccoMutation.isPending && (
          <View style={[styles.center, { paddingVertical: spacing[8] }]}>
            <Text variant="body" color={colors.destructive}>
              {reccoMutation.error instanceof ApiError && reccoMutation.error.status === 429
                ? "You've reached today's limit (10 requests)."
                : 'Failed to generate recipes.'}
            </Text>
          </View>
        )}

        {/* Recipes */}
        {!reccoMutation.isPending && recipes.length > 0 && (
          <View style={{ padding: spacing[4] }}>
            {reccoMutation.data?.fromCache && (
              <Text variant="caption" muted style={{ marginBottom: spacing[3], textAlign: 'center' }}>
                From cache
              </Text>
            )}
            {recipes.map((recipe, i) => (
              <RecipeCard key={i} recipe={recipe} index={i} />
            ))}

            <Separator style={{ marginVertical: spacing[4] }} />

            {/* Ingredient diff across all recipes */}
            <IngredientDiff
              recipeIngredients={recipes.flatMap((r) => r.ingredients)}
              localItems={localItems}
              onAddToList={handleAddToList}
              addingIds={addingIds}
            />
          </View>
        )}

        {/* Prompt state */}
        {!reccoMutation.isPending && !reccoMutation.isError && recipes.length === 0 && (
          <View style={[styles.center, { paddingVertical: spacing[12] }]}>
            <Text variant="body" muted>Pick a cuisine above to get recipes.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cuisineSection: {},
  cuisinePill: {},
  center: { alignItems: 'center' },
});
