import { tokens } from '../lib/tokens';
import { useColorScheme } from './useColorScheme';

export function useTheme() {
  const scheme = useColorScheme();
  return {
    colors: tokens.colors[scheme],
    spacing: tokens.spacing,
    radius: tokens.radius,
    typography: tokens.typography,
    shadow: tokens.shadow,
    scheme,
  };
}
