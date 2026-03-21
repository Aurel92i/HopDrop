import { Linking, Alert } from 'react-native';

/**
 * Ouvre un fichier depuis une URL Cloudinary dans Safari/Chrome.
 * - PDF uploadé en /raw/upload/ → Safari l'affiche nativement
 * - Image uploadée en /image/upload/ → Safari l'affiche aussi
 * 
 * Pour les anciens PDF uploadés en /image/upload/ par erreur,
 * on corrige l'URL à la volée.
 */
export async function openFileFromUrl(url: string, _filename?: string): Promise<void> {
  try {
    let finalUrl = url;

    // Corriger les anciens PDF uploadés comme "image" sur Cloudinary
    if (url.includes('/image/upload/') && url.toLowerCase().endsWith('.pdf')) {
      finalUrl = url.replace('/image/upload/', '/raw/upload/');
    }

    await Linking.openURL(finalUrl);
  } catch (error: any) {
    console.error('Erreur ouverture fichier:', error);
    Alert.alert('Erreur', "Impossible d'ouvrir le fichier.");
  }
}