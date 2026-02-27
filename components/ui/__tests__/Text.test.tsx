import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from '../Text';

// useTheme returns light tokens by default (system pref = light)
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#0F172A',
      textMuted: '#64748B',
    },
    typography: {
      h1: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
      h2: { fontSize: 22, fontWeight: '600', lineHeight: 30 },
      h3: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
      body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
      bodyMd: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
      small: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
      caption: { fontSize: 11, fontWeight: '400', lineHeight: 16 },
    },
  }),
}));

describe('Text component', () => {
  it('renders children', () => {
    render(<Text>Hello</Text>);
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('applies h1 variant font size', () => {
    render(<Text variant="h1">Title</Text>);
    const element = screen.getByText('Title');
    expect(element.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontSize: 28 }),
      ]),
    );
  });

  it('applies muted color when muted=true', () => {
    render(<Text muted>Muted text</Text>);
    const element = screen.getByText('Muted text');
    const flatStyle = [].concat(...element.props.style);
    const colorStyle = flatStyle.find((s: any) => s?.color === '#64748B');
    expect(colorStyle).toBeTruthy();
  });

  it('applies custom color override', () => {
    render(<Text color="#FF0000">Red text</Text>);
    const element = screen.getByText('Red text');
    const flatStyle = [].concat(...element.props.style);
    const colorStyle = flatStyle.find((s: any) => s?.color === '#FF0000');
    expect(colorStyle).toBeTruthy();
  });
});
