import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ItemRow } from '../ItemRow';
import type { GroceryItem } from '../../../../types';

const mockTheme = {
  colors: {
    primary: '#16a34a',
    primaryForeground: '#FFFFFF',
    background: '#FFFFFF',
    text: '#0F172A',
    textMuted: '#64748B',
    border: '#E2E8F0',
    destructive: '#DC2626',
    surfaceRaised: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.4)',
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  radius: { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 },
  typography: {
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    bodyMd: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
    small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
    h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  },
};

jest.mock('../../../../hooks/useTheme', () => ({
  useTheme: () => mockTheme,
}));

const baseItem: GroceryItem = {
  itemId: 'item-1',
  listId: 'list-1',
  itemName: 'Tomatoes',
  quantity: 2,
  unit: 'kg',
  lastUpdated: '2024-01-01T00:00:00Z',
};

function makeProps(overrides = {}) {
  return {
    item: baseItem,
    selected: false,
    onToggleSelect: jest.fn(),
    onUpdate: jest.fn().mockResolvedValue(undefined),
    onDelete: jest.fn(),
    ...overrides,
  };
}

describe('ItemRow', () => {
  describe('display mode', () => {
    it('renders item name and quantity', () => {
      render(<ItemRow {...makeProps()} />);
      expect(screen.getByText('Tomatoes')).toBeTruthy();
      expect(screen.getByText('2 kg')).toBeTruthy();
    });

    it('renders unchecked checkbox when not selected', () => {
      render(<ItemRow {...makeProps({ selected: false })} />);
      expect(screen.queryByText('✓')).toBeNull();
    });

    it('renders checkmark when selected', () => {
      render(<ItemRow {...makeProps({ selected: true })} />);
      expect(screen.getByText('✓')).toBeTruthy();
    });

    it('calls onToggleSelect when checkbox testID is pressed', () => {
      const onToggleSelect = jest.fn();
      render(<ItemRow {...makeProps({ onToggleSelect })} />);
      fireEvent.press(screen.getByTestId('item-checkbox'));
      expect(onToggleSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('inline edit mode', () => {
    it('enters edit mode when item name is tapped', () => {
      render(<ItemRow {...makeProps()} />);
      fireEvent.press(screen.getByText('Tomatoes'));
      expect(screen.getByDisplayValue('Tomatoes')).toBeTruthy();
      expect(screen.getByDisplayValue('2')).toBeTruthy();
    });

    it('shows confirm (✓) and cancel (✕) icons in edit mode', () => {
      render(<ItemRow {...makeProps()} />);
      fireEvent.press(screen.getByText('Tomatoes'));
      expect(screen.getByText('✓')).toBeTruthy();
      expect(screen.getByText('✕')).toBeTruthy();
    });

    it('cancels edit and reverts to display mode', () => {
      render(<ItemRow {...makeProps()} />);
      fireEvent.press(screen.getByText('Tomatoes'));
      fireEvent.press(screen.getByText('✕'));
      expect(screen.getByText('Tomatoes')).toBeTruthy();
      expect(screen.getByText('2 kg')).toBeTruthy();
    });

    it('calls onUpdate with new values on confirm', async () => {
      const onUpdate = jest.fn().mockResolvedValue(undefined);
      render(<ItemRow {...makeProps({ onUpdate })} />);

      fireEvent.press(screen.getByText('Tomatoes'));
      fireEvent.changeText(screen.getByDisplayValue('Tomatoes'), 'Cherry Tomatoes');

      await act(async () => { fireEvent.press(screen.getByText('✓')); });

      expect(onUpdate).toHaveBeenCalledWith({
        itemName: 'Cherry Tomatoes',
        quantity: 2,
        unit: 'kg',
      });
    });

    it('calls onUpdate with updated quantity', async () => {
      const onUpdate = jest.fn().mockResolvedValue(undefined);
      render(<ItemRow {...makeProps({ onUpdate })} />);

      fireEvent.press(screen.getByText('Tomatoes'));
      fireEvent.changeText(screen.getByDisplayValue('2'), '5');

      await act(async () => { fireEvent.press(screen.getByText('✓')); });

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5 }),
      );
    });

    it('does not call onUpdate when name is empty', async () => {
      const onUpdate = jest.fn().mockResolvedValue(undefined);
      render(<ItemRow {...makeProps({ onUpdate })} />);

      fireEvent.press(screen.getByText('Tomatoes'));
      fireEvent.changeText(screen.getByDisplayValue('Tomatoes'), '   ');

      await act(async () => { fireEvent.press(screen.getByText('✓')); });

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('does not call onUpdate when quantity is invalid', async () => {
      const onUpdate = jest.fn().mockResolvedValue(undefined);
      render(<ItemRow {...makeProps({ onUpdate })} />);

      fireEvent.press(screen.getByText('Tomatoes'));
      fireEvent.changeText(screen.getByDisplayValue('2'), 'abc');

      await act(async () => { fireEvent.press(screen.getByText('✓')); });

      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('shows delete button in display mode', () => {
      render(<ItemRow {...makeProps()} />);
      // Delete ✕ on right side is present in display mode
      expect(screen.getByText('✕')).toBeTruthy();
    });
  });
});
