import { Linking, Alert } from 'react-native';

/**
 * Ouvre un fichier depuis une URL dans Safari/Chrome.
 * Safari affiche nativement les PDF uploadés en raw sur Cloudinary.
 */
export async function openFileFromUrl(url: string, _filename?: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch (error: any) {
    console.error('Erreur ouverture fichier:', error);
    Alert.alert('Erreur', "Impossible d'ouvrir le fichier.");
  }
}