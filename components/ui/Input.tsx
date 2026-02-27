import React from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from './Text';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: Props) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="small" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          typography.body,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.destructive : colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="small" color={colors.destructive} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { marginBottom: 2 },
  error: { marginTop: 2 },
});
