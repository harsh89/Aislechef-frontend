import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { tokens } from '../../lib/tokens';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bodyMd' | 'small' | 'caption';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
}

export function Text({ variant = 'body', color, muted, style, ...props }: Props) {
  const { colors, typography } = useTheme();
  const textColor = color ?? (muted ? colors.textMuted : colors.text);

  return (
    <RNText
      style={[typography[variant], { color: textColor }, style]}
      {...props}
    />
  );
}
