import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RecipeCard } from '../RecipeCard';
import type { Recipe } from '../../../../types';

jest.mock('../../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#16a34a',
      primaryForeground: '#FFFFFF',
      border: '#E2E8F0',
      surfaceRaised: '#FFFFFF',
      text: '#0F172A',
      textMuted: '#64748B',
    },
    spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20 },
    radius: { sm: 6, md: 10, lg: 14, full: 9999 },
    shadow: { sm: {}, md: {} },
    typography: {
      h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
      body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
      bodyMd: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
      small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
      caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
    },
  }),
}));

const mockRecipe: Recipe = {
  name: 'Butter Chicken',
  cuisine: 'Indian',
  ingredients: [
    { name: 'Chicken', quantity: 500, unit: 'g' },
    { name: 'Butter', quantity: 2, unit: 'tbsp' },
    { name: 'Cream', quantity: 100, unit: 'mL' },
  ],
  instructions: [
    'Marinate chicken',
    'Cook in butter',
    'Add cream and simmer',
  ],
};

describe('RecipeCard', () => {
  it('renders recipe name', () => {
    render(<RecipeCard recipe={mockRecipe} index={0} />);
    expect(screen.getByText('Butter Chicken')).toBeTruthy();
  });

  it('renders cuisine', () => {
    render(<RecipeCard recipe={mockRecipe} index={0} />);
    expect(screen.getByText('Indian')).toBeTruthy();
  });

  it('renders all ingredients', () => {
    render(<RecipeCard recipe={mockRecipe} index={0} />);
    // Use getAllByText since "Chicken" appears in both recipe name and ingredient list
    expect(screen.getAllByText(/Chicken/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Butter/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cream/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows index badge (1-based)', () => {
    render(<RecipeCard recipe={mockRecipe} index={0} />);
    expect(screen.getByText('1')).toBeTruthy();

    render(<RecipeCard recipe={mockRecipe} index={1} />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('instructions are hidden by default', () => {
    render(<RecipeCard recipe={mockRecipe} index={0} />);
    expect(screen.queryByText('Marinate chicken')).toBeNull();
  });

  it('toggles instructions visible on press', () => {
    render(<RecipeCard recipe={mockRecipe} index={0} />);
    fireEvent.press(screen.getByText('Show Instructions ▼'));
    expect(screen.getByText('Marinate chicken')).toBeTruthy();
    expect(screen.getByText('Cook in butter')).toBeTruthy();
    expect(screen.getByText('Add cream and simmer')).toBeTruthy();
  });

  it('hides instructions when toggled again', () => {
    render(<RecipeCard recipe={mockRecipe} index={0} />);
    fireEvent.press(screen.getByText('Show Instructions ▼'));
    fireEvent.press(screen.getByText('Hide Instructions ▲'));
    expect(screen.queryByText('Marinate chicken')).toBeNull();
  });
});
