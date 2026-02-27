import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props extends PressableProps {
  variant?: Variant;
  size?: Size;
  label: string;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  label,
  loading,
  fullWidth,
  disabled,
  style,
  ...props
}: Props) {
  const { colors, radius, spacing } = useTheme();

  const bgColor: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.secondary,
    destructive: colors.destructive,
    ghost: 'transparent',
  };

  const fgColor: Record<Variant, string> = {
    primary: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    destructive: colors.destructiveForeground,
    ghost: colors.text,
  };

  const paddingV: Record<Size, number> = { sm: spacing[2], md: spacing[3], lg: spacing[4] };
  const paddingH: Record<Size, number> = { sm: spacing[3], md: spacing[4], lg: spacing[6] };
  const fontSize: Record<Size, number> = { sm: 13, md: 15, lg: 16 };

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bgColor[variant],
          borderRadius: radius.md,
          paddingVertical: paddingV[size],
          paddingHorizontal: paddingH[size],
          opacity: pressed || disabled ? 0.65 : 1,
          ...(fullWidth && { width: '100%' }),
          ...(variant === 'ghost' && { borderWidth: 0 }),
        },
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={fgColor[variant]} size="small" />
      ) : (
        <Text
          variant={size === 'sm' ? 'small' : 'bodyMd'}
          color={fgColor[variant]}
          style={{ fontSize: fontSize[size] }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
