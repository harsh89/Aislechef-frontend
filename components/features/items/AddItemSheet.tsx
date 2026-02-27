import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '../../../hooks/useTheme';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { UNITS } from '../../../types';
import type { Unit } from '../../../types';

interface Props {
  sheetRef: React.RefObject<BottomSheet>;
  onAdd: (itemName: string, quantity: number, unit: Unit) => Promise<void>;
}

export function AddItemSheet({ sheetRef, onAdd }: Props) {
  const { colors, spacing, radius } = useTheme();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState<Unit>('pcs');
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameInputRef = useRef<TextInput>(null);

  const snapPoints = ['45%'];

  const handleSheetChange = useCallback((index: number) => {
    if (index === 0) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, []);

  async function handleAdd() {
    const parsedQty = parseFloat(qty);
    if (!name.trim()) { setError('Item name is required.'); return; }
    if (isNaN(parsedQty) || parsedQty < 0) { setError('Enter a valid quantity.'); return; }
    setError('');
    setLoading(true);
    try {
      await onAdd(name.trim(), parsedQty, unit);
      setName('');
      setQty('1');
      setUnit('pcs');
      sheetRef.current?.close();
    } catch {
      setError('Could not add item. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: colors.surfaceRaised }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={[styles.container, { padding: spacing[5] }]}>
        <Text variant="h3" style={{ marginBottom: spacing[4] }}>Add Item</Text>

        {/* Name */}
        <Text variant="small" muted style={{ marginBottom: spacing[1] }}>Name</Text>
        <TextInput
          ref={nameInputRef}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Tomatoes"
          placeholderTextColor={colors.textMuted}
          returnKeyType="next"
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[3],
              fontSize: 15,
              marginBottom: spacing[3],
            },
          ]}
        />

        {/* Qty + Unit row */}
        <View style={styles.row}>
          <View style={styles.qtyWrap}>
            <Text variant="small" muted style={{ marginBottom: spacing[1] }}>Quantity</Text>
            <TextInput
              value={qty}
              onChangeText={setQty}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[3],
                  fontSize: 15,
                },
              ]}
            />
          </View>
          <View style={styles.unitWrap}>
            <Text variant="small" muted style={{ marginBottom: spacing[1] }}>Unit</Text>
            <Pressable
              onPress={() => setUnitPickerVisible(true)}
              style={[
                styles.input,
                styles.unitBtn,
                {
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[3],
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text variant="body">{unit}</Text>
            </Pressable>
          </View>
        </View>

        {error ? <Text variant="small" color={colors.destructive} style={{ marginTop: spacing[2] }}>{error}</Text> : null}

        <Button
          label="Add to List"
          onPress={handleAdd}
          loading={loading}
          fullWidth
          style={{ marginTop: spacing[4] }}
        />
      </BottomSheetView>

      {/* Unit picker */}
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
                  onPress={() => { setUnit(u); setUnitPickerVisible(false); }}
                  style={[
                    styles.unitOption,
                    {
                      paddingVertical: spacing[3],
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                      backgroundColor: unit === u ? colors.primary + '15' : 'transparent',
                    },
                  ]}
                >
                  <Text variant="body" color={unit === u ? colors.primary : colors.text}>{u}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  qtyWrap: { flex: 1 },
  unitWrap: { flex: 1 },
  input: { borderWidth: 1 },
  unitBtn: { justifyContent: 'center' },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { maxHeight: 400 },
  unitOption: { paddingHorizontal: 4 },
});
