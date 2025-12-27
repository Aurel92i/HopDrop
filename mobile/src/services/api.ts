import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = __DEV__
  ? 'http://192.168.1.78:3000'  // Ton IP locale
  : 'https://api.hopdrop.fr';

class ApiService {
  private api: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour ajouter le token
    this.api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercepteur pour gérer le refresh token
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            await this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) return null;

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);

        return accessToken;
      } catch (error) {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async logout() {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  }

  // === Notifications ===
  async updateFcmToken(fcmToken: string) {
    const response = await this.api.put('/users/fcm-token', { fcmToken });
    return response.data;
  }

  // === Auth ===
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }) {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data;

    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);

    return { user, accessToken, refreshToken };
  }

  async getMe() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.api.post('/auth/forgot-password', { email });
    return response.data;
  }

  // === Users ===
  async updateProfile(data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }) {
    const response = await this.api.put('/users/me', data);
    return response.data;
  }

  // === Addresses ===
  async getAddresses() {
    const response = await this.api.get('/addresses');
    return response.data;
  }

  async createAddress(data: any) {
    const response = await this.api.post('/addresses', data);
    return response.data;
  }

  async updateAddress(id: string, data: any) {
    const response = await this.api.put(`/addresses/${id}`, data);
    return response.data;
  }

  async deleteAddress(id: string) {
    const response = await this.api.delete(`/addresses/${id}`);
    return response.data;
  }

  // === Parcels ===
  async getParcels(status?: string) {
    const params = status ? { status } : {};
    const response = await this.api.get('/parcels', { params });
    return response.data;
  }

  async getParcel(id: string) {
    const response = await this.api.get(`/parcels/${id}`);
    return response.data;
  }

  async createParcel(data: any) {
    const response = await this.api.post('/parcels', data);
    return response.data;
  }

  async cancelParcel(id: string) {
    const response = await this.api.delete(`/parcels/${id}`);
    return response.data;
  }

  async confirmPickup(parcelId: string, pickupCode: string) {
    const response = await this.api.post(`/parcels/${parcelId}/confirm-pickup`, { pickupCode });
    return response.data;
  }

  async getParcelHistory(page: number = 1, limit: number = 10) {
    const response = await this.api.get(`/parcels/history?page=${page}&limit=${limit}`);
    return response.data;
  }

  // === Missions ===
  async getAvailableMissions(latitude: number, longitude: number, radius: number = 5) {
    const response = await this.api.get('/missions/available', {
      params: { latitude, longitude, radius },
    });
    return response.data;
  }

  async acceptMission(parcelId: string) {
    const response = await this.api.post(`/missions/${parcelId}/accept`);
    return response.data;
  }

  async getCurrentMissions() {
    const response = await this.api.get('/missions/current');
    return response.data;
  }

  async getMissionHistory() {
    const response = await this.api.get('/missions/history');
    return response.data;
  }

  async pickupMission(missionId: string) {
    const response = await this.api.post(`/missions/${missionId}/pickup`);
    return response.data;
  }

  async deliverMission(missionId: string, data?: { proofPhotoUrl?: string; notes?: string }) {
    const response = await this.api.post(`/missions/${missionId}/deliver`, data || {});
    return response.data;
  }

  async cancelMission(missionId: string, reason?: string) {
    const response = await this.api.post(`/missions/${missionId}/cancel`, { reason });
    return response.data;
  }

  async missionDepart(missionId: string, latitude: number, longitude: number) {
    const response = await this.api.post(`/missions/${missionId}/depart`, { latitude, longitude });
    return response.data;
  }

  async missionArrived(missionId: string) {
    const response = await this.api.post(`/missions/${missionId}/arrived`);
    return response.data;
  }

  // === Carrier ===
  async updateAvailability(isAvailable: boolean) {
    const response = await this.api.put('/carrier/availability', { isAvailable });
    return response.data;
  }

  async updateLocation(latitude: number, longitude: number) {
    const response = await this.api.put('/carrier/location', { latitude, longitude });
    return response.data;
  }

  async getCarrierLocation(carrierId: string) {
    const response = await this.api.get(`/carrier/${carrierId}/location`);
    return response.data;
  }

  async getCarrierProfile() {
    const response = await this.api.get('/carrier/profile');
    return response.data.profile;
  }

  async getCarrierDocuments() {
    const response = await this.api.get('/carrier/documents');
    return response.data;
  }

  async uploadCarrierDocument(type: string, fileUrl: string) {
    const response = await this.api.post('/carrier/documents', { type, fileUrl });
    return response.data;
  }

  async deleteCarrierDocument(type: string) {
    const response = await this.api.delete(`/carrier/documents/${type}`);
    return response.data;
  }

  async updateCarrierDocumentsProfile(data: { vehicleType?: string; hasOwnPrinter?: boolean }) {
    const response = await this.api.patch('/carrier/documents/profile', data);
    return response.data;
  }

  // === Admin ===
  async getAdminStats() {
    const response = await this.api.get('/admin/stats');
    return response.data;
  }

  async getPendingDocuments() {
    const response = await this.api.get('/admin/documents/pending');
    return response.data;
  }

  async approveDocument(documentId: string) {
    const response = await this.api.post(`/admin/documents/${documentId}/approve`);
    return response.data;
  }

  async rejectDocument(documentId: string, reason: string) {
    const response = await this.api.post(`/admin/documents/${documentId}/reject`, { reason });
    return response.data;
  }

  // === Payments ===
  async createPaymentIntent(parcelId: string) {
    const response = await this.api.post('/payments/create-intent', { parcelId });
    return response.data;
  }

  async getTransactions() {
    const response = await this.api.get('/payments/transactions');
    return response.data;
  }

  // === Reviews ===
  async createReview(data: { parcelId: string; rating: number; comment?: string }) {
    const response = await this.api.post('/reviews', data);
    return response.data;
  }

  async getMyReviews() {
    const response = await this.api.get('/reviews/received');
    return response.data;
  }

  // === Chat ===
  async getConversations() {
    const response = await this.api.get('/chat/conversations');
    return response.data;
  }

  async getConversation(parcelId: string) {
    const response = await this.api.get(`/chat/parcel/${parcelId}`);
    return response.data;
  }

  async sendMessage(conversationId: string, content: string) {
    const response = await this.api.post(`/chat/${conversationId}/messages`, { content });
    return response.data;
  }

  async markConversationAsRead(conversationId: string) {
    const response = await this.api.post(`/chat/${conversationId}/read`);
    return response.data;
  }

  // === Uploads ===
  async uploadImage(uri: string): Promise<string> {
    const token = await SecureStore.getItemAsync('accessToken');
    
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);

    const response = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur upload' }));
      throw new Error(error.message || 'Erreur lors de l\'upload');
    }

    const data = await response.json();
    return data.url;
  }

  async uploadFile(fileUri: string, folder: string): Promise<{ url: string; publicId: string }> {
    const response = await fetch(fileUri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const uploadResponse = await this.api.post('/uploads', {
            file: base64,
            folder,
          });
          resolve(uploadResponse.data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erreur lecture fichier'));
      reader.readAsDataURL(blob);
    });
  }

  // === Packaging ===
  async confirmPackaging(missionId: string, photoUri: string) {
    const uploadedPhotoUrl = await this.uploadImage(photoUri);
    const response = await this.api.post('/packaging/carrier-confirm', {
      missionId,
      photoUrl: uploadedPhotoUrl,
    });
    return response.data;
  }

  async vendorConfirmPackaging(parcelId: string) {
    const response = await this.api.post('/packaging/vendor-confirm', { parcelId });
    return response.data;
  }

  async vendorRejectPackaging(parcelId: string, reason: string) {
    const response = await this.api.post('/packaging/vendor-reject', { parcelId, reason });
    return response.data;
  }

  async getPackagingStatus(parcelId: string) {
    const response = await this.api.get(`/packaging/status/${parcelId}`);
    return response.data;
  }

  // === Delivery - Confirmation de dépôt avec timer 12H ===

  /**
   * Livreur confirme le dépôt du colis avec une preuve photo
   * Déclenche le timer de 12H pour le client
   */
  async confirmDelivery(missionId: string, proofUri: string) {
    const proofUrl = await this.uploadImage(proofUri);
    const response = await this.api.post('/delivery/confirm', {
      missionId,
      proofUrl,
    });
    return response.data;
  }

  /**
   * Client confirme avoir reçu la notification de dépôt
   * Déclenche le paiement au livreur
   * Peut optionnellement inclure une note et un commentaire
   */
  async clientConfirmDelivery(parcelId: string, rating?: number, comment?: string) {
    const response = await this.api.post('/delivery/client-confirm', { parcelId, rating, comment });
    return response.data;
  }

  /**
   * Client conteste la livraison
   * Ouvre un ticket de support
   */
  async clientContestDelivery(parcelId: string, reason: string) {
    const response = await this.api.post('/delivery/client-contest', { parcelId, reason });
    return response.data;
  }

  /**
   * Récupérer le statut de livraison d'un colis
   */
  async getDeliveryStatus(parcelId: string) {
    const response = await this.api.get(`/delivery/status/${parcelId}`);
    return response.data;
  }
}

export const api = new ApiService();
