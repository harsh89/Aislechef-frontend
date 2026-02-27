import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ orientation = 'horizontal', style, ...props }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.border,
          ...(orientation === 'horizontal'
            ? { height: StyleSheet.hairlineWidth, width: '100%' }
            : { width: StyleSheet.hairlineWidth, height: '100%' }),
        },
        style,
      ]}
      {...props}
    />
  );
}

import { StyleSheet } from 'react-native';
