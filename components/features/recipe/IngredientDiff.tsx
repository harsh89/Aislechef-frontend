import React from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Text } from '../../ui/Text';
import { Separator } from '../../ui/Separator';
import type { RecipeIngredient, GroceryItem, Unit } from '../../../types';

interface DiffItem {
  ingredient: RecipeIngredient;
  type: 'extra' | 'out_of_stock';
}

interface Props {
  recipeIngredients: RecipeIngredient[];
  localItems: GroceryItem[];
  onAddToList: (ingredient: RecipeIngredient) => Promise<void>;
  addingIds: Set<string>;
}

function computeDiff(
  ingredients: RecipeIngredient[],
  localItems: GroceryItem[],
): DiffItem[] {
  return ingredients.flatMap((ing) => {
    const match = localItems.find((item) =>
      item.itemName.toLowerCase().includes(ing.name.toLowerCase()) ||
      ing.name.toLowerCase().includes(item.itemName.toLowerCase()),
    );
    if (!match) return [{ ingredient: ing, type: 'extra' as const }];
    if (match.quantity === 0) return [{ ingredient: ing, type: 'out_of_stock' as const }];
    return [];
  });
}

export function IngredientDiff({ recipeIngredients, localItems, onAddToList, addingIds }: Props) {
  const { colors, spacing, radius } = useTheme();
  const diffItems = computeDiff(recipeIngredients, localItems);

  const extraItems = diffItems.filter((d) => d.type === 'extra');
  const outOfStock = diffItems.filter((d) => d.type === 'out_of_stock');

  if (diffItems.length === 0) {
    return (
      <View style={[styles.empty, { padding: spacing[4] }]}>
        <Text variant="small" muted>You have all the ingredients!</Text>
      </View>
    );
  }

  function DiffSection({ title, items, accentColor }: { title: string; items: DiffItem[]; accentColor: string }) {
    if (items.length === 0) return null;
    return (
      <View style={{ marginBottom: spacing[4] }}>
        <Text variant="bodyMd" style={{ marginBottom: spacing[2] }}>{title}</Text>
        {items.map((d, i) => {
          const key = `${d.ingredient.name}-${i}`;
          const isAdding = addingIds.has(key);
          return (
            <View
              key={key}
              style={[
                styles.diffRow,
                {
                  backgroundColor: accentColor + '12',
                  borderRadius: radius.md,
                  padding: spacing[3],
                  marginBottom: spacing[2],
                },
              ]}
            >
              <View style={styles.flex}>
                <Text variant="bodyMd">{d.ingredient.name}</Text>
                {d.ingredient.quantity > 0 && (
                  <Text variant="small" muted>
                    {d.ingredient.quantity} {d.ingredient.unit}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => onAddToList(d.ingredient)}
                disabled={isAdding}
                style={[
                  styles.addBtn,
                  {
                    backgroundColor: accentColor,
                    borderRadius: radius.md,
                    paddingVertical: spacing[1],
                    paddingHorizontal: spacing[3],
                    opacity: isAdding ? 0.6 : 1,
                  },
                ]}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text variant="small" color={colors.primaryForeground}>+ Add</Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.container, { padding: spacing[4] }]}>
      <Text variant="h3" style={{ marginBottom: spacing[3] }}>Shopping Gaps</Text>
      <DiffSection title="Not in your list" items={extraItems} accentColor={colors.primary} />
      <DiffSection title="Out of stock" items={outOfStock} accentColor={colors.warning} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  empty: {},
  diffRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  addBtn: { alignItems: 'center', justifyContent: 'center' },
});
