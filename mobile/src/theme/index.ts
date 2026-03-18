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
  // Accent — Navy profond
  accent: '#0d2c54',
  accentDark: '#001219',
  accentLight: '#33415c',
  accent50: '#E8EDF4',

  // CTA — Orange logo
  cta: '#FF4422',
  ctaLight: '#FF6B50',
  cta50: '#FFF0EC',

  // Logo
  logoOrange: '#FF4422',

  // Futuriste — Métalliques
  chrome: '#C8CED8',
  chromeDark: '#8892A0',
  chromeLight: '#E8ECF0',
  titanium: '#2D3748',
  graphite: '#1A202C',
  steel: '#A0AEC0',

  // Néon — Accents futuristes
  neonGreen: '#2ECC71',
  neonGreen50: '#EAFAF1',
  electricBlue: '#00B0FF',
  electricBlue50: '#E0F4FF',
  plasma: '#7C4DFF',
  plasma50: '#F0EBFF',

  // Status badges — Métalliques + néon
  statusPending: '#F59E0B',
  statusPendingBg: '#1A202C',
  statusAccepted: '#00E676',
  statusAcceptedBg: '#0A1F12',
  statusPickedUp: '#00B0FF',
  statusPickedUpBg: '#0A1824',
  statusDelivered: '#00E676',
  statusDeliveredBg: '#0A1F12',
  statusCancelled: '#FF5252',
  statusCancelledBg: '#1F0A0A',
  statusExpired: '#8892A0',
  statusExpiredBg: '#1A202C',

  // Semantic
  success: '#00E676',
  success50: '#E0FFF0',
  warning: '#F59E0B',
  warning50: '#FEF9E7',
  danger: '#FF5252',
  danger50: '#FFE8E8',

  // Neutrals
  text: '#212529',
  textSecondary: '#33415c',
  textTertiary: '#595959',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F4F5F7',
  border: '#E2E4E8',
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: hdColors.accent,
    primaryContainer: hdColors.accent50,
    secondary: hdColors.cta,
    secondaryContainer: hdColors.cta50,
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
};