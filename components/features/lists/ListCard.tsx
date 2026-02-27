import React, { useState } from 'react';
import { Pressable, View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Text } from '../../ui/Text';
import type { GroceryList } from '../../../types';

interface Props {
  list: GroceryList;
  onPress: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

export function ListCard({ list, onPress, onDelete, onRename }: Props) {
  const { colors, spacing, radius, shadow } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(list.name);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== list.name) {
      onRename(trimmed);
    } else {
      setDraft(list.name);
    }
    setEditing(false);
  }

  return (
    <Pressable
      onPress={editing ? undefined : onPress}
      onLongPress={() => { setDraft(list.name); setEditing(true); }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          borderColor: colors.border,
          marginHorizontal: spacing[4],
          marginVertical: spacing[1],
          padding: spacing[4],
          opacity: pressed ? 0.75 : 1,
          ...shadow.sm,
        },
      ]}
    >
      <View style={styles.row}>
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commitRename}
            onSubmitEditing={commitRename}
            autoFocus
            style={[
              styles.flex,
              {
                color: colors.text,
                fontSize: 15,
                fontWeight: '500',
                borderBottomWidth: 1,
                borderBottomColor: colors.primary,
                paddingVertical: 2,
              },
            ]}
          />
        ) : (
          <Text variant="bodyMd" style={styles.flex} numberOfLines={1}>
            {list.name}
          </Text>
        )}
        <Pressable
          onPress={(e) => { e.stopPropagation(); onDelete(); }}
          hitSlop={8}
          style={styles.deleteBtn}
        >
          <Text variant="small" color={colors.destructive}>Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  deleteBtn: { marginLeft: 8 },
});
