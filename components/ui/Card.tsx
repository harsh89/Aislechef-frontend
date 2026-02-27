import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props extends ViewProps {
  elevated?: boolean;
}

export function Card({ elevated, style, children, ...props }: Props) {
  const { colors, radius, shadow, spacing } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.lg,
          padding: spacing[4],
          borderWidth: 1,
          borderColor: colors.border,
          ...(elevated ? shadow.md : shadow.sm),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
