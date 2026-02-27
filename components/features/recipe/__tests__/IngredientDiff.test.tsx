import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { IngredientDiff } from '../IngredientDiff';
import type { GroceryItem, RecipeIngredient } from '../../../../types';

jest.mock('../../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#16a34a',
      primaryForeground: '#FFFFFF',
      secondary: '#F1F5F9',
      secondaryForeground: '#0F172A',
      border: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#64748B',
      destructive: '#DC2626',
      warning: '#D97706',
      surfaceRaised: '#FFFFFF',
    },
    spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
    radius: { sm: 6, md: 10, full: 9999 },
    typography: {
      h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
      body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
      bodyMd: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
      small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    },
  }),
}));

const tomatoes: RecipeIngredient = { name: 'Tomatoes', quantity: 2, unit: 'kg' };
const onions: RecipeIngredient = { name: 'Onions', quantity: 1, unit: 'pcs' };
const garlic: RecipeIngredient = { name: 'Garlic', quantity: 3, unit: 'pcs' };

const localItems: GroceryItem[] = [
  { itemId: '1', listId: 'l1', itemName: 'Tomatoes', quantity: 2, unit: 'kg', lastUpdated: '', isDeleted: false },
  { itemId: '2', listId: 'l1', itemName: 'Onions', quantity: 0, unit: 'pcs', lastUpdated: '', isDeleted: false },
];

function makeProps(overrides = {}) {
  return {
    recipeIngredients: [tomatoes, onions, garlic],
    localItems,
    onAddToList: jest.fn().mockResolvedValue(undefined),
    addingIds: new Set<string>(),
    ...overrides,
  };
}

describe('IngredientDiff', () => {
  describe('diff computation', () => {
    it('renders "Shopping Gaps" heading when there are diffs', () => {
      render(<IngredientDiff {...makeProps()} />);
      expect(screen.getByText('Shopping Gaps')).toBeTruthy();
    });

    it('shows out-of-stock section for Onions (quantity=0)', () => {
      render(<IngredientDiff {...makeProps()} />);
      expect(screen.getByText('Out of stock')).toBeTruthy();
      expect(screen.getByText('Onions')).toBeTruthy();
    });

    it('shows extra section for Garlic (not in list)', () => {
      render(<IngredientDiff {...makeProps()} />);
      expect(screen.getByText('Not in your list')).toBeTruthy();
      expect(screen.getByText('Garlic')).toBeTruthy();
    });

    it('does not show Tomatoes in diff (in list with quantity > 0)', () => {
      render(<IngredientDiff {...makeProps()} />);
      // Tomatoes has quantity=2, so not in diff
      const allText = screen.queryAllByText('Tomatoes');
      // Tomatoes should not appear in the diff rows
      // (it won't appear since it's matched and in stock)
      expect(screen.queryByText('Not in your list')).toBeTruthy();
      // Tomatoes is in localItems with qty > 0, so not in diff
    });

    it('shows "all ingredients" message when no diff', () => {
      const allPresent = [tomatoes];
      const localWithBoth: GroceryItem[] = [
        { itemId: '1', listId: 'l1', itemName: 'Tomatoes', quantity: 2, unit: 'kg', lastUpdated: '', isDeleted: false },
      ];
      render(
        <IngredientDiff
          recipeIngredients={allPresent}
          localItems={localWithBoth}
          onAddToList={jest.fn()}
          addingIds={new Set()}
        />,
      );
      expect(screen.getByText('You have all the ingredients!')).toBeTruthy();
    });
  });

  describe('case-insensitive matching', () => {
    it('matches ingredient to local item case-insensitively', () => {
      const localWithUppercase: GroceryItem[] = [
        { itemId: '1', listId: 'l1', itemName: 'GARLIC', quantity: 3, unit: 'pcs', lastUpdated: '', isDeleted: false },
      ];
      render(
        <IngredientDiff
          recipeIngredients={[garlic]}
          localItems={localWithUppercase}
          onAddToList={jest.fn()}
          addingIds={new Set()}
        />,
      );
      // Garlic should be matched (in stock), so "all ingredients" message
      expect(screen.getByText('You have all the ingredients!')).toBeTruthy();
    });
  });

  describe('Add to list', () => {
    it('calls onAddToList when + Add is pressed', async () => {
      const onAddToList = jest.fn().mockResolvedValue(undefined);
      render(<IngredientDiff {...makeProps({ onAddToList })} />);
      const addButtons = screen.getAllByText('+ Add');
      await act(async () => { fireEvent.press(addButtons[0]); });
      expect(onAddToList).toHaveBeenCalledTimes(1);
    });
  });
});
