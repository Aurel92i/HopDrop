import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displayLarge: { fontFamily: 'System', fontSize: 57, fontWeight: '800' as const },
  displayMedium: { fontFamily: 'System', fontSize: 45, fontWeight: '800' as const },
  displaySmall: { fontFamily: 'System', fontSize: 36, fontWeight: '700' as const },
  headlineLarge: { fontFamily: 'System', fontSize: 32, fontWeight: '700' as const },
  headlineMedium: { fontFamily: 'System', fontSize: 28, fontWeight: '700' as const },
  headlineSmall: { fontFamily: 'System', fontSize: 24, fontWeight: '600' as const },
  titleLarge: { fontFamily: 'System', fontSize: 22, fontWeight: '600' as const },
  titleMedium: { fontFamily: 'System', fontSize: 16, fontWeight: '600' as const },
  titleSmall: { fontFamily: 'System', fontSize: 14, fontWeight: '600' as const },
  bodyLarge: { fontFamily: 'System', fontSize: 16, fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'System', fontSize: 14, fontWeight: '400' as const },
  bodySmall: { fontFamily: 'System', fontSize: 12, fontWeight: '400' as const },
  labelLarge: { fontFamily: 'System', fontSize: 14, fontWeight: '600' as const },
  labelMedium: { fontFamily: 'System', fontSize: 12, fontWeight: '500' as const },
  labelSmall: { fontFamily: 'System', fontSize: 11, fontWeight: '500' as const },
};

export const hdColors = {
  // Accent - Teal (Vinted-like)
  accent: '#09B1BA',
  accentDark: '#078E95',
  accentLight: '#3DC4CB',
  accent50: '#E6F7F8',

  // Logo
  logoOrange: '#FF4422',

  // Status badges - remplis
  statusPending: '#E67E22',
  statusAccepted: '#27AE60',
  statusPickedUp: '#09B1BA',
  statusDelivered: '#27AE60',
  statusCancelled: '#C0392B',
  statusExpired: '#95A5A6',

  // Semantic
  success: '#27AE60',
  success50: '#EAFAF1',
  warning: '#E67E22',
  warning50: '#FEF5E9',
  danger: '#C0392B',
  danger50: '#FADBD8',

  // Neutrals - Vinted clean
  text: '#1A1A1A',
  textSecondary: '#757575',
  textTertiary: '#BDBDBD',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F2',
  border: '#E0E0E0',
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: hdColors.accent,
    primaryContainer: hdColors.accent50,
    secondary: '#b4b8ab',
    secondaryContainer: '#F2F3F0',
    tertiary: hdColors.warning,
    tertiaryContainer: hdColors.warning50,
    error: hdColors.danger,
    errorContainer: hdColors.danger50,
    background: hdColors.background,
    surface: hdColors.surface,
    surfaceVariant: hdColors.surfaceSecondary,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: hdColors.text,
    onSurface: hdColors.text,
    onSurfaceVariant: hdColors.textSecondary,
    outline: hdColors.border,
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

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
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
  VINTED: { label: 'Vinted', icon: 'hanger' },
  MONDIAL_RELAY: { label: 'Mondial Relay', icon: 'store' },
  COLISSIMO: { label: 'Colissimo (La Poste)', icon: 'email' },
  CHRONOPOST: { label: 'Chronopost', icon: 'lightning-bolt' },
  RELAIS_COLIS: { label: 'Relais Colis', icon: 'package-variant' },
  UPS: { label: 'UPS', icon: 'truck' },
  OTHER: { label: 'Autre', icon: 'help-circle' },
};