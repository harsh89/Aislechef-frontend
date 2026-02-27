import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#0F172A',
      textMuted: '#64748B',
      surface: '#F8FAFC',
      border: '#E2E8F0',
      destructive: '#DC2626',
    },
    spacing: { 1: 4, 2: 8, 3: 12, 4: 16 },
    radius: { md: 10 },
    typography: {
      body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
      small: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
    },
  }),
}));

describe('Input component', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('renders without label', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.queryByText('Email')).toBeNull();
  });

  it('shows error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeTruthy();
  });

  it('calls onChangeText when typing', () => {
    const onChange = jest.fn();
    render(<Input onChangeText={onChange} />);
    const input = screen.getByDisplayValue('') ?? screen.UNSAFE_getByType(require('react-native').TextInput);
    fireEvent.changeText(input, 'hello@test.com');
    expect(onChange).toHaveBeenCalledWith('hello@test.com');
  });

  it('does not show error when not provided', () => {
    render(<Input label="Name" />);
    // No error text rendered
    expect(screen.queryByText('This field is required')).toBeNull();
  });
});
