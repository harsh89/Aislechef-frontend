import React, { useState } from 'react';
import {
  View,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Text } from '../../ui/Text';
import { UNITS } from '../../../types';
import type { GroceryItem, Unit } from '../../../types';

interface Props {
  item: GroceryItem;
  selected: boolean;
  isDeleting: boolean;
  onToggleSelect: () => void;
  onUpdate: (patch: { itemName: string; quantity: number; unit: Unit }) => Promise<void>;
  onDelete: () => void;
}

export function ItemRow({ item, selected, isDeleting, onToggleSelect, onUpdate, onDelete }: Props) {
  const { colors, spacing, radius } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.itemName);
  const [draftQty, setDraftQty] = useState(String(item.quantity));
  const [draftUnit, setDraftUnit] = useState<Unit>(item.unit);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function startEdit() {
    setDraftName(item.itemName);
    setDraftQty(String(item.quantity));
    setDraftUnit(item.unit);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function commitEdit() {
    const qty = parseFloat(draftQty);
    if (!draftName.trim() || isNaN(qty) || qty < 0) return;
    setSaving(true);
    try {
      await onUpdate({ itemName: draftName.trim(), quantity: qty, unit: draftUnit });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete Item', `Remove "${item.itemName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: selected ? colors.primary + '12' : colors.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
        },
      ]}
    >
      {/* Checkbox */}
      <Pressable onPress={onToggleSelect} style={styles.checkboxWrap} hitSlop={8} testID="item-checkbox">
        <View
          style={[
            styles.checkbox,
            {
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          {selected && (
            <Text variant="caption" color={colors.primaryForeground} style={styles.checkmark}>
              ✓
            </Text>
          )}
        </View>
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        {editing ? (
          <View style={styles.editContainer}>
            {/* Name input */}
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              autoFocus
              placeholder="Item name"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.editInput,
                {
                  color: colors.text,
                  borderBottomColor: colors.primary,
                  fontSize: 15,
                },
              ]}
            />
            {/* Qty + Unit row */}
            <View style={styles.editQtyRow}>
              <TextInput
                value={draftQty}
                onChangeText={setDraftQty}
                keyboardType="decimal-pad"
                placeholder="Qty"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.editQtyInput,
                  {
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing[2],
                    paddingVertical: spacing[1],
                    fontSize: 14,
                    width: 72,
                  },
                ]}
              />
              <Pressable
                onPress={() => setUnitPickerVisible(true)}
                style={[
                  styles.unitBtn,
                  {
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing[2],
                    paddingVertical: spacing[1],
                  },
                ]}
              >
                <Text variant="small">{draftUnit}</Text>
              </Pressable>
            </View>
            {/* Actions */}
            <View style={styles.editActions}>
              <Pressable onPress={cancelEdit} hitSlop={8}>
                <Text variant="small" color={colors.textMuted}>✕</Text>
              </Pressable>
              <Pressable onPress={commitEdit} disabled={saving} hitSlop={8}>
                <Text variant="small" color={colors.primary}>
                  {saving ? '…' : '✓'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={startEdit} style={styles.displayContent}>
            <Text variant="bodyMd" numberOfLines={1}>{item.itemName}</Text>
            <Text variant="small" muted>
              {item.quantity} {item.unit}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Delete */}
      {!editing && (
        <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteBtn} disabled={isDeleting}>
          {isDeleting
            ? <ActivityIndicator size="small" color={colors.destructive} />
            : <Text variant="small" color={colors.destructive}>✕</Text>}
        </Pressable>
      )}

      {/* Unit picker modal */}
      <Modal
        visible={unitPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUnitPickerVisible(false)}
      >
        <Pressable
          style={[styles.pickerOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setUnitPickerVisible(false)}
        >
          <View
            style={[
              styles.pickerSheet,
              {
                backgroundColor: colors.surfaceRaised,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: spacing[4],
              },
            ]}
          >
            <Text variant="h3" style={{ marginBottom: spacing[3] }}>Select Unit</Text>
            <ScrollView>
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => { setDraftUnit(u); setUnitPickerVisible(false); }}
                  style={[
                    styles.unitOption,
                    {
                      paddingVertical: spacing[3],
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                      backgroundColor: draftUnit === u ? colors.primary + '15' : 'transparent',
                    },
                  ]}
                >
                  <Text variant="body" color={draftUnit === u ? colors.primary : colors.text}>{u}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  checkboxWrap: { marginRight: 12 },
  checkbox: {},
  checkmark: { fontWeight: '700' },
  content: { flex: 1 },
  displayContent: { gap: 2 },
  editContainer: { gap: 6 },
  editInput: {
    borderBottomWidth: 1,
    paddingVertical: 2,
    marginBottom: 4,
  },
  editQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editQtyInput: {},
  unitBtn: {},
  editActions: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end', marginTop: 4 },
  deleteBtn: { marginLeft: 12, padding: 4 },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { maxHeight: 400 },
  unitOption: { paddingHorizontal: 4 },
});
