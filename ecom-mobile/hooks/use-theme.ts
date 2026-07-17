import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Brand, Spacing, Radius } from '@/constants/theme';

/**
 * Hook ini mengembalikan warna yang sesuai dengan mode gelap/terang.
 * Gunakan ini di semua komponen sebagai pengganti import Colors langsung.
 *
 * Contoh pemakaian:
 *   const { C, brand } = useTheme();
 *   style={{ backgroundColor: C.surface, color: brand.primary }}
 */
export function useTheme() {
  const scheme = useColorScheme();
  const C = scheme === 'dark' ? Colors.dark : Colors.light;
  return { C, brand: Brand, spacing: Spacing, radius: Radius, scheme };
}