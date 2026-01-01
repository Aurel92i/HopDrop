import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displayLarge: { fontFamily: 'System', fontSize: 57 },
  displayMedium: { fontFamily: 'System', fontSize: 45 },
  displaySmall: { fontFamily: 'System', fontSize: 36 },
  headlineLarge: { fontFamily: 'System', fontSize: 32 },
  headlineMedium: { fontFamily: 'System', fontSize: 28 },
  headlineSmall: { fontFamily: 'System', fontSize: 24 },
  titleLarge: { fontFamily: 'System', fontSize: 22 },
  titleMedium: { fontFamily: 'System', fontSize: 16 },
  titleSmall: { fontFamily: 'System', fontSize: 14 },
  bodyLarge: { fontFamily: 'System', fontSize: 16 },
  bodyMedium: { fontFamily: 'System', fontSize: 14 },
  bodySmall: { fontFamily: 'System', fontSize: 12 },
  labelLarge: { fontFamily: 'System', fontSize: 14 },
  labelMedium: { fontFamily: 'System', fontSize: 12 },
  labelSmall: { fontFamily: 'System', fontSize: 11 },
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
    primaryContainer: '#DBEAFE',
    secondary: '#10B981',
    secondaryContainer: '#D1FAE5',
    tertiary: '#F59E0B',
    tertiaryContainer: '#FEF3C7',
    error: '#EF4444',
    errorContainer: '#FEE2E2',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#111827',
    onSurface: '#111827',
    onSurfaceVariant: '#6B7280',
    outline: '#D1D5DB',
  },
  roundness: 12,
};

export const colors = theme.colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const sizes = {
  parcel: {
    SMALL: { label: 'Petit', description: 'Enveloppe, petit objet', price: '3,00 €' },
    MEDIUM: { label: 'Moyen', description: 'Boîte à chaussures', price: '4,00 €' },
    LARGE: { label: 'Grand', description: 'Carton standard', price: '5,50 €' },
    XLARGE: { label: 'Très grand', description: 'Grand carton', price: '7,00 €' },
  },
};

export const carriers = {
  VINTED: { label: 'Vinted', icon: 'shopping' },
  MONDIAL_RELAY: { label: 'Mondial Relay', icon: 'store' },
  COLISSIMO: { label: 'Colissimo (La Poste)', icon: 'email' },
  CHRONOPOST: { label: 'Chronopost', icon: 'lightning-bolt' },
  RELAIS_COLIS: { label: 'Relais Colis', icon: 'package-variant' },
  UPS: { label: 'UPS', icon: 'truck' },
  OTHER: { label: 'Autre', icon: 'help-circle' },
};
