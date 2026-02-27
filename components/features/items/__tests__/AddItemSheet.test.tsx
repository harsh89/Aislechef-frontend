import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { AddItemSheet } from '../AddItemSheet';
import BottomSheet from '@gorhom/bottom-sheet';

const mockTheme = {
  colors: {
    primary: '#16a34a',
    primaryForeground: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceRaised: '#FFFFFF',
    text: '#0F172A',
    textMuted: '#64748B',
    border: '#E2E8F0',
    destructive: '#DC2626',
    overlay: 'rgba(0,0,0,0.4)',
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  radius: { sm: 6, md: 10, lg: 14 },
  typography: {
    h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    bodyMd: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
    small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
  },
};

jest.mock('../../../../hooks/useTheme', () => ({
  useTheme: () => mockTheme,
}));

function renderSheet(onAdd = jest.fn()) {
  const ref = createRef<BottomSheet>();
  const utils = render(<AddItemSheet sheetRef={ref} onAdd={onAdd} />);
  return { ...utils, ref, onAdd };
}

describe('AddItemSheet', () => {
  it('renders Add Item heading', () => {
    renderSheet();
    expect(screen.getByText('Add Item')).toBeTruthy();
  });

  it('renders name, quantity, and unit fields', () => {
    renderSheet();
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Quantity')).toBeTruthy();
    expect(screen.getByText('Unit')).toBeTruthy();
  });

  it('shows error when name is empty on submit', async () => {
    const { onAdd } = renderSheet();
    const addBtn = screen.getByText('Add to List');
    await act(async () => { fireEvent.press(addBtn); });
    expect(screen.getByText('Item name is required.')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows error when quantity is invalid', async () => {
    const { onAdd } = renderSheet();
    const nameInput = screen.getByPlaceholderText('e.g. Tomatoes');
    fireEvent.changeText(nameInput, 'Apples');
    const qtyInput = screen.getByPlaceholderText('1');
    fireEvent.changeText(qtyInput, 'xyz');
    await act(async () => { fireEvent.press(screen.getByText('Add to List')); });
    expect(screen.getByText('Enter a valid quantity.')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('calls onAdd with name, quantity, and unit when valid', async () => {
    const onAdd = jest.fn().mockResolvedValue(undefined);
    renderSheet(onAdd);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Tomatoes'), 'Apples');
    fireEvent.changeText(screen.getByPlaceholderText('1'), '3');

    await act(async () => { fireEvent.press(screen.getByText('Add to List')); });

    expect(onAdd).toHaveBeenCalledWith('Apples', 3, 'pcs');
  });

  it('defaults unit to pcs', () => {
    renderSheet();
    expect(screen.getByText('pcs')).toBeTruthy();
  });

  it('shows error from failed onAdd', async () => {
    const onAdd = jest.fn().mockRejectedValue(new Error('Network error'));
    renderSheet(onAdd);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Tomatoes'), 'Milk');
    await act(async () => { fireEvent.press(screen.getByText('Add to List')); });
    expect(screen.getByText('Could not add item. Try again.')).toBeTruthy();
  });
});
