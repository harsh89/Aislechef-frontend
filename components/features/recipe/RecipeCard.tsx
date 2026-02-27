import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Text } from '../../ui/Text';
import { Separator } from '../../ui/Separator';
import type { Recipe } from '../../../types';

interface Props {
  recipe: Recipe;
  index: number;
}

export function RecipeCard({ recipe, index }: Props) {
  const { colors, spacing, radius, shadow } = useTheme();
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          borderColor: colors.border,
          borderWidth: 1,
          marginBottom: spacing[4],
          ...shadow.sm,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { padding: spacing[4], borderBottomColor: colors.border }]}>
        <View style={[styles.indexBadge, { backgroundColor: colors.primary, borderRadius: radius.full }]}>
          <Text variant="caption" color={colors.primaryForeground} style={styles.indexText}>
            {index + 1}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text variant="h3" numberOfLines={2}>{recipe.name}</Text>
          <Text variant="small" muted>{recipe.cuisine}</Text>
        </View>
      </View>

      {/* Ingredients */}
      <View style={{ padding: spacing[4] }}>
        <Text variant="bodyMd" style={{ marginBottom: spacing[2] }}>Ingredients</Text>
        {recipe.ingredients.map((ing, i) => (
          <View key={i} style={[styles.ingRow, { paddingVertical: spacing[1] }]}>
            <Text variant="small" style={styles.dot} color={colors.primary}>•</Text>
            <Text variant="small" style={styles.flex}>
              {ing.name}{ing.quantity > 0 ? ` — ${ing.quantity} ${ing.unit}` : ''}
            </Text>
          </View>
        ))}
      </View>

      <Separator />

      {/* Instructions toggle */}
      <Pressable
        onPress={() => setShowInstructions((v) => !v)}
        style={[styles.toggleBtn, { padding: spacing[4] }]}
      >
        <Text variant="bodyMd" color={colors.primary}>
          {showInstructions ? 'Hide Instructions ▲' : 'Show Instructions ▼'}
        </Text>
      </Pressable>

      {showInstructions && (
        <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}>
          {recipe.instructions.map((step, i) => (
            <View key={i} style={[styles.stepRow, { marginBottom: spacing[2] }]}>
              <Text variant="small" color={colors.primary} style={styles.stepNum}>{i + 1}.</Text>
              <Text variant="small" style={styles.flex}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  indexBadge: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  indexText: { fontWeight: '700' },
  headerText: { flex: 1 },
  ingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  dot: { width: 12 },
  flex: { flex: 1 },
  toggleBtn: {},
  stepRow: { flexDirection: 'row', gap: 6 },
  stepNum: { width: 20, fontWeight: '600' },
});
