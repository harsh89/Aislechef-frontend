import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemeStore } from '../stores/theme.store';
import type { ColorScheme } from '../lib/tokens';

export function useColorScheme(): ColorScheme {
  const systemScheme = useRNColorScheme();
  const preference = useThemeStore((s) => s.preference);

  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}
