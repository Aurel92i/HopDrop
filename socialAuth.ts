import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  });
} catch (e) {
  console.warn('Google Sign-In non disponible (Expo Go)');
}

export async function signInWithGoogle(): Promise<string> {
  if (!GoogleSignin) {
    throw { code: 'SIGN_IN_CANCELLED', message: 'Google Sign-In non disponible dans Expo Go' };
  }
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (!response.data?.idToken) {
    throw new Error('Impossible de récupérer le token Google');
  }
  return response.data.idToken;
}

export async function signInWithApple(): Promise<string> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error('Impossible de récupérer le token Apple');
  }
  return credential.identityToken;
}

export function isAppleAuthAvailable(): boolean {
  return Platform.OS === 'ios';
}