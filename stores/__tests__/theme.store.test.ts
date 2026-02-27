// Use Zustand's getState/setState directly — no React rendering needed for store tests
import { useThemeStore } from '../theme.store';

beforeEach(() => {
  useThemeStore.setState({ preference: 'system' });
});

describe('useThemeStore', () => {
  it('defaults to system preference', () => {
    expect(useThemeStore.getState().preference).toBe('system');
  });

  it('setPreference updates to light', () => {
    useThemeStore.getState().setPreference('light');
    expect(useThemeStore.getState().preference).toBe('light');
  });

  it('setPreference updates to dark', () => {
    useThemeStore.getState().setPreference('dark');
    expect(useThemeStore.getState().preference).toBe('dark');
  });

  it('can toggle back to system', () => {
    useThemeStore.getState().setPreference('dark');
    useThemeStore.getState().setPreference('system');
    expect(useThemeStore.getState().preference).toBe('system');
  });
});
