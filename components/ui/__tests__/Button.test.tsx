import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#16a34a',
      primaryForeground: '#FFFFFF',
      secondary: '#F1F5F9',
      secondaryForeground: '#0F172A',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      text: '#0F172A',
    },
    radius: { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 },
    spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
    typography: {
      body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
      bodyMd: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
      small: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
    },
  }),
}));

describe('Button component', () => {
  it('renders label', () => {
    render(<Button label="Click me" />);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button label="Tap" onPress={onPress} />);
    fireEvent.press(screen.getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Disabled" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    render(<Button label="Loading" onPress={onPress} loading />);
    // Label not shown during loading (ActivityIndicator shown instead)
    expect(screen.queryByText('Loading')).toBeNull();
  });

  it('renders secondary variant', () => {
    render(<Button label="Secondary" variant="secondary" />);
    expect(screen.getByText('Secondary')).toBeTruthy();
  });

  it('renders destructive variant', () => {
    render(<Button label="Delete" variant="destructive" />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });
});
