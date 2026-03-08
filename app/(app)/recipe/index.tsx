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
import { CUISINES, RECIPE_MODES, normalizeUnit } from '../../../types';
import type {
  CuisineFilter,
  RecipeMode,
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

  const { colors, spacing, radius } = useTheme();
  const [cuisine, setCuisine] = useState<CuisineFilter | null>(null);
  const [recipeMode, setRecipeMode] = useState<RecipeMode>('detailed');
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

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
    mutationFn: (cuisineFilter: CuisineFilter) => {
      const selectedItems = localItems
        .filter((item) => selectedItemIds.includes(item.itemId))
        .map((item) => item.itemName);
      return api.post<ReccoResponse>('/recco', { cuisineFilter, selectedItems, recipeMode });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 429) {
        Alert.alert('Rate limit', "You've reached today's limit (10 requests).");
      } else {
        Alert.alert('Error', 'Could not generate recipes. Please try again.');
      }
    },
  });

  function handleGenerate() {
    if (!cuisine) return;
    reccoMutation.mutate(cuisine);
  }

  async function handleAddToList(ingredient: RecipeIngredient) {
    const key = ingredient.name;
    setAddingIds((prev) => new Set(prev).add(key));
    try {
      await api.post(`/lists/${listId}/items`, {
        itemName: ingredient.name,
        quantity: ingredient.quantity || 1,
        unit: normalizeUnit(ingredient.unit),
      });
      setAddedIds((prev) => new Set(prev).add(key));
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
        {/* Mode toggle */}
        <View style={{ padding: spacing[4], paddingBottom: 0 }}>
          <Text variant="bodyMd" style={{ marginBottom: spacing[3] }}>Recipe mode</Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {RECIPE_MODES.map((m) => {
              const isSelected = recipeMode === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => setRecipeMode(m.value)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: spacing[3],
                    paddingHorizontal: spacing[3],
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : colors.secondary,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Text
                    variant="small"
                    color={isSelected ? colors.primaryForeground : colors.secondaryForeground}
                    style={{ fontWeight: '600' }}
                  >
                    {m.label}
                  </Text>
                  <Text
                    variant="caption"
                    color={isSelected ? colors.primaryForeground : colors.mutedForeground}
                    style={{ marginTop: spacing[1] }}
                  >
                    {m.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Separator style={{ marginTop: spacing[4] }} />

        {/* Cuisine picker */}
        <View style={[styles.cuisineSection, { padding: spacing[4] }]}>
          <Text variant="bodyMd" style={{ marginBottom: spacing[3] }}>Select a cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
            {CUISINES.map((c) => {
              const isSelected = cuisine === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCuisine(c)}
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

          {/* Generate button */}
          <Pressable
            onPress={handleGenerate}
            disabled={!cuisine || reccoMutation.isPending}
            style={({ pressed }) => ({
              marginTop: spacing[4],
              paddingVertical: spacing[3],
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: 'center',
              opacity: !cuisine || reccoMutation.isPending ? 0.5 : pressed ? 0.8 : 1,
            })}
          >
            {reccoMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Text variant="bodyMd" color={colors.primaryForeground} style={{ fontWeight: '600' }}>
                Generate Recipes
              </Text>
            )}
          </Pressable>
        </View>

        <Separator />

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
              addedIds={addedIds}
            />
          </View>
        )}

        {/* Prompt state */}
        {!reccoMutation.isPending && !reccoMutation.isError && recipes.length === 0 && (
          <View style={[styles.center, { paddingVertical: spacing[12] }]}>
            <Text variant="body" muted>
              {cuisine ? 'Tap Generate Recipes to continue.' : 'Pick a cuisine above to get started.'}
            </Text>
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
