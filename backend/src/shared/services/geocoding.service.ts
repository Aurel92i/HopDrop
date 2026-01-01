interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

class GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private userAgent = 'HopDrop/1.0 (contact@hopdrop.fr)';

  /**
   * Convertir une adresse en coordonnées GPS
   */
  async geocode(street: string, city: string, postalCode: string, country: string = 'France'): Promise<GeocodingResult | null> {
    try {
      const query = `${street}, ${postalCode} ${city}, ${country}`;
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?q=${encodedQuery}&format=json&limit=1`;
      
      console.log('🌍 Géocodage - Requête:', query);
      console.log('🌍 Géocodage - URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Language': 'fr',
          'Accept': 'application/json',
        },
      });

      console.log('🌍 Géocodage - Status:', response.status);

      if (!response.ok) {
        console.error('🌍 Géocodage - Erreur HTTP:', response.status, response.statusText);
        return null;
      }

      const data: NominatimResponse[] = await response.json();
      console.log('🌍 Géocodage - Résultats:', JSON.stringify(data));

      if (data.length === 0) {
        console.log('🌍 Géocodage - Aucun résultat pour:', query);
        return null;
      }

      const result = data[0];
      console.log('🌍 Géocodage - Trouvé:', result.lat, result.lon);
      
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
      };
    } catch (error) {
      console.error('🌍 Géocodage - Exception:', error);
      return null;
    }
  }

  /**
   * Rechercher des adresses (autocomplétion)
   */
  async searchAddresses(query: string, limit: number = 5): Promise<GeocodingResult[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodedQuery}&format=json&limit=${limit}&countrycodes=fr&addressdetails=1`,
        {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Language': 'fr',
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const data: NominatimResponse[] = await response.json();

      return data.map((item) => ({
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name,
      }));
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
      return [];
    }
  }

  /**
   * Géocodage inverse : coordonnées → adresse
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Language': 'fr',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Erreur géocodage inverse:', error);
      return null;
    }
  }
}

export const geocodingService = new GeocodingService();