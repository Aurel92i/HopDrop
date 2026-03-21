import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Linking } from 'react-native';

export async function openFileFromUrl(url: string, _filename?: string): Promise<void> {
  try {
    let finalUrl = url;
    if (url.includes('/image/upload/') && url.toLowerCase().endsWith('.pdf')) {
      finalUrl = url.replace('/image/upload/', '/raw/upload/');
    }

    // Détecter l'extension depuis l'URL
    const urlFileName = finalUrl.split('/').pop()?.split('?')[0] || '';
    const dotParts = urlFileName.split('.');
    const rawExt = dotParts.length > 1 ? dotParts.pop()!.toLowerCase() : '';

    // Si pas d'extension valide, deviner depuis le chemin Cloudinary
    let ext: string;
    if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(rawExt)) {
      ext = rawExt;
    } else if (finalUrl.includes('/raw/upload/')) {
      ext = 'pdf';
    } else if (finalUrl.includes('/image/upload/')) {
      ext = 'jpg';
    } else {
      ext = 'pdf';
    }

    const localName = `bordereau.${ext}`;
    const localUri = `${FileSystem.cacheDirectory}${localName}`;

    const downloadResult = await FileSystem.downloadAsync(finalUrl, localUri);

    if (downloadResult.status !== 200) {
      throw new Error(`Téléchargement échoué (status ${downloadResult.status})`);
    }

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (sharingAvailable) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: guessMimeType(ext),
        UTI: guessUTI(ext),
        dialogTitle: 'Ouvrir le document',
      });
    } else {
      await Linking.openURL(finalUrl);
    }
  } catch (error: any) {
    console.error('Erreur ouverture fichier:', error);
    Alert.alert('Erreur', "Impossible d'ouvrir le fichier.");
  }
}

function guessMimeType(ext: string): string {
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

function guessUTI(ext: string): string {
  switch (ext) {
    case 'pdf': return 'com.adobe.pdf';
    case 'png': return 'public.png';
    case 'jpg':
    case 'jpeg': return 'public.jpeg';
    default: return 'public.data';
  }
}