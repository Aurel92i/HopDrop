import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

/**
 * Si le fichier est une image, le convertit en PDF.
 * Si c'est déjà un PDF, retourne l'URI tel quel.
 * Retourne toujours un { uri, isPdf: true }
 */
export async function ensurePdf(fileUri: string, mimeType?: string): Promise<string> {
  // Si c'est déjà un PDF, on le retourne tel quel
  const isPdf =
    mimeType === 'application/pdf' ||
    fileUri.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return fileUri;
  }

  // C'est une image → on la convertit en PDF via expo-print
  // On lit l'image en base64 pour l'insérer dans un HTML
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Déterminer le MIME de l'image
  const ext = fileUri.split('.').pop()?.toLowerCase() || 'jpeg';
  const imageMime = ext === 'png' ? 'image/png' : 'image/jpeg';

  // Créer un PDF contenant l'image pleine page
  const html = `
    <html>
      <head>
        <style>
          @page { margin: 0; }
          body { margin: 0; padding: 0; }
          img {
            width: 100%;
            height: auto;
            display: block;
          }
        </style>
      </head>
      <body>
        <img src="data:${imageMime};base64,${base64}" />
      </body>
    </html>
  `;

  const { uri: pdfUri } = await Print.printToFileAsync({ html });

  return pdfUri;
}