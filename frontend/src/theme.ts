// Central theme/design tokens for Daman-style premium gaming platform
export const colors = {
  // brand
  brand: '#FF7E67',
  brandPrimary: '#FF6B6B',
  brandSecondary: '#FF9A9E',
  brandTertiary: '#FFEFEF',
  onBrandPrimary: '#FFFFFF',
  onBrandTertiary: '#E53935',
  // surface
  surface: '#FFFFFF',
  surfaceSecondary: '#F7F8FA',
  surfaceTertiary: '#EDEDF0',
  surfaceInverse: '#212121',
  // text
  onSurface: '#1A1A1A',
  onSurfaceSecondary: '#4A4A4A',
  onSurfaceMuted: '#8A8A8A',
  onSurfaceInverse: '#FFFFFF',
  // state
  success: '#2ECA7F',
  warning: '#FFB020',
  error: '#FF4D4F',
  info: '#4A4A4A',
  // structure
  border: '#EAEAEA',
  borderStrong: '#D1D1D1',
  divider: '#F0F0F0',
  // gradient stops for hero
  gradientStart: '#FF9A9E',
  gradientEnd: '#FF6B6B',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
} as const;

export const font = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};
