// mobile/src/services/api.ts

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = __DEV__
  ? 'https://hopdrop-production.up.railway.app'
  : 'https://hopdrop-production.up.railway.app';

// === Types pour l'analyse IA ===

export type PackageSize = 'XS' | 'S' | 'M' | 'L';
export type LockerSize = 'XS' | 'S' | 'M' | 'L' | 'NON_COMPATIBLE';

export interface Dimensions {
  height: number;
  width: number;
  depth: number;
}

export interface ArticleCategory {
  main: string;
  sub: string;
  icon: string;
}

export interface AnalysisResult {
  articleCategory: ArticleCategory;
  articleName: string;
  articleDimensions: Dimensions;
  packageSize: PackageSize;
  lockerSize: LockerSize;
  packageDimensions: Dimensions;
  compatibleCarrier: string;
  justification: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isCompatible: boolean;
}

// === Types pour les documents livreur ===

export interface RequiredDocument {
  type: DocumentType;
  label: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  status: DocumentStatus | null;
  fileUrl: string | null;
  rejectionReason: string | null;
}

export interface CarrierDocumentResponse {
  id: string;
  carrierId: string;
  type: DocumentType;
  fileUrl: string;
  status: DocumentStatus;
  rejectionReason: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
}

// === Types pour les transactions ===

export interface Transaction {
  id: string;
  parcelId: string;
  payerId: string;
  payeeId: string | null;
  amount: number;
  platformFee: number;
  carrierPayout: number;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  status: 'PENDING' | 'CAPTURED' | 'TRANSFERRED' | 'REFUNDED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  parcel?: {
    id: string;
    dropoffName: string;
    status: string;
  };
}

// === Types pour les gains livreur ===

export interface CarrierEarnings {
  today: number;
  week: number;
  month: number;
  total: number;
  pending: number;
  available: number;
}

// === Types pour le solde livreur ===

export interface CarrierBalance {
  total: number;
  today: number;
  week: number;
  pending: number;
  available: number;
}

// Tarification fixe
export const PRICING = {
  FIXED_PRICE: 10,
  PLATFORM_FEE: 1,
  CARRIER_PAYOUT: 9,
} as const;

// Tailles de colis avec descriptions
export const PACKAGE_SIZES = {
  XS: {
    name: 'Extra Small',
    description: 'Bijoux, accessoires, petits objets',
    maxDimensions: { height: 4, width: 23, depth: 40 },
  },
  S: {
    name: 'Small',
    description: 'Vetements legers, livres, petite electronique',
    maxDimensions: { height: 8, width: 38, depth: 64 },
  },
  M: {
    name: 'Medium',
    description: 'Chaussures, pulls, sacs',
    maxDimensions: { height: 19, width: 38, depth: 64 },
  },
  L: {
    name: 'Large',
    description: 'Manteaux, gros objets',
    maxDimensions: { height: 38, width: 39, depth: 64 },
  },
} as const;

class ApiService {
  private api: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 60000, // 60s pour les gros fichiers
      headers: {
        'Content-Type': 'application/json',
      },
      maxContentLength: 50 * 1024 * 1024, // 50 MB
      maxBodyLength: 50 * 1024 * 1024,     // 50 MB
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

    // Intercepteur pour gerer le refresh token
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

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.api.post('/auth/change-password', { currentPassword, newPassword });
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

  async getMissionHistory(page: number = 1, limit: number = 10) {
    const response = await this.api.get('/missions/history', { params: { page, limit } });
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

  async getCarrierEarnings(): Promise<CarrierEarnings> {
    const response = await this.api.get('/carrier/earnings');
    return response.data;
  }

  // === Carrier Documents ===
  async getCarrierDocuments(): Promise<{ documents: RequiredDocument[]; profile: any }> {
    const response = await this.api.get('/carrier/documents');
    return response.data;
  }

  async getRequiredDocuments(): Promise<{ documents: RequiredDocument[] }> {
    const response = await this.api.get('/carrier/documents/required');
    return response.data;
  }

  // ============================================================
  // UPLOAD UNIFIE : tout passe par base64 via /uploads (JSON)
  // ============================================================

  // Upload via base64 (JSON) - methode PRINCIPALE pour tous les uploads
  async uploadBase64(dataUri: string, folder: string = 'carrier-documents'): Promise<string> {
    console.log('[API] uploadBase64 appelé - route: /uploads - folder:', folder);
    const response = await this.api.post('/uploads', {
      file: dataUri,
      folder: folder,
    });
    console.log('[API] uploadBase64 réussi - URL:', response.data.url);
    return response.data.url;
  }

  // Upload image via URI (camera/galerie) - convertit en base64 puis upload
  async uploadImage(uri: string): Promise<string> {
    console.log('[API] uploadImage appelé avec URI:', uri.substring(0, 50) + '...');
    
    // Lire le fichier en base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Detecter le type MIME depuis l'extension
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';
    else if (ext === 'heic' || ext === 'heif') mimeType = 'image/heic';
    else if (ext === 'pdf') mimeType = 'application/pdf';

    const dataUri = `data:${mimeType};base64,${base64}`;
    return this.uploadBase64(dataUri, 'hopdrop');
  }

  // Upload document livreur : upload + enregistrement en une seule methode
  async uploadCarrierDocument(type: DocumentType, fileUri: string): Promise<{ document: CarrierDocumentResponse }> {
    console.log('[API] uploadCarrierDocument appelé - type:', type);
    // Utilise uploadImage qui passe par base64
    const imageUrl = await this.uploadImage(fileUri);
    const response = await this.api.post('/carrier/documents', {
      type,
      fileUrl: imageUrl,
    });
    return response.data;
  }

  // Enregistrer un document avec une URL deja uploadee
  async saveCarrierDocument(type: DocumentType, fileUrl: string): Promise<{ document: CarrierDocumentResponse }> {
    console.log('[API] saveCarrierDocument appelé - type:', type, '- URL:', fileUrl.substring(0, 50) + '...');
    const response = await this.api.post('/carrier/documents', {
      type,
      fileUrl,
    });
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

  async getDocumentsStatus(): Promise<{ documentsComplete: boolean; documentsVerified: boolean }> {
    const response = await this.api.get('/carrier/documents/status');
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
  async createPaymentIntent(parcelId: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const response = await this.api.post('/payments/create-intent', { parcelId });
    return response.data;
  }

  async createPaymentIntentForNewParcel(data: { parcelId: string }): Promise<{ clientSecret: string; paymentIntentId: string; amount: number }> {
    const response = await this.api.post('/payments/create-preauth-intent', data);
    return response.data;
  }

  async confirmPayment(paymentIntentId: string): Promise<{ success: boolean; transaction: Transaction }> {
    const response = await this.api.post('/payments/confirm', { paymentIntentId });
    return response.data;
  }

  async simulatePayment(parcelId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.api.post(`/payments/simulate/${parcelId}`);
      return response.data;
    } catch (error) {
      console.log('Simulate payment API call failed, continuing in test mode');
      return { success: true, message: 'Payment simulated (test mode - offline)' };
    }
  }

  async getCarrierBalance(): Promise<CarrierBalance> {
    try {
      const response = await this.api.get('/payments/carrier/balance');
      return response.data;
    } catch (error) {
      return { total: 0, today: 0, week: 0, pending: 0, available: 0 };
    }
  }

  async getCarrierTransactions(): Promise<any[]> {
    try {
      const response = await this.api.get('/payments/carrier/transactions');
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getTransactions(page: number = 1, limit: number = 20): Promise<{ transactions: Transaction[]; total: number; page: number; totalPages: number }> {
    const response = await this.api.get('/payments/transactions', { params: { page, limit } });
    return response.data;
  }

  async getTransactionsByRole(role: 'payer' | 'payee', page: number = 1, limit: number = 20): Promise<{ transactions: Transaction[]; total: number }> {
    const response = await this.api.get(`/payments/transactions/${role}`, { params: { page, limit } });
    return response.data;
  }

  // === Stripe Connect ===
  async createConnectAccount(): Promise<{ accountId: string; alreadyExists?: boolean }> {
    const response = await this.api.post('/payments/connect/create-account');
    return response.data;
  }

  async getConnectOnboardingLink(): Promise<{ url: string }> {
    const response = await this.api.post('/payments/connect/create-onboarding-link');
    return response.data;
  }

  async getConnectStatus(): Promise<{
    hasAccount: boolean;
    accountId?: string;
    status?: 'PENDING' | 'ACTIVE' | 'RESTRICTED' | null;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  }> {
    const response = await this.api.get('/payments/connect/status');
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

  // === AI Analysis ===
  async analyzeArticleImage(imageUri: string): Promise<AnalysisResult> {
    const imageUrl = await this.uploadImage(imageUri);
    const response = await this.api.post('/ai/analyze', { imageUrl });
    return response.data.analysis;
  }

  async analyzeArticleImageBase64(base64: string): Promise<AnalysisResult> {
    const response = await this.api.post('/ai/analyze', { base64Image: base64 });
    return response.data.analysis;
  }

  async getPackageSizes() {
    const response = await this.api.get('/ai/package-sizes');
    return response.data;
  }

  async getPricing() {
    const response = await this.api.get('/ai/pricing');
    return response.data;
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

  // === Delivery ===
  async confirmDelivery(missionId: string, proofUri: string) {
    const proofUrl = await this.uploadImage(proofUri);
    const response = await this.api.post('/delivery/confirm', {
      missionId,
      proofUrl,
    });
    return response.data;
  }

  async clientConfirmDelivery(parcelId: string, rating?: number, comment?: string) {
    const response = await this.api.post('/delivery/client-confirm', { parcelId, rating, comment });
    return response.data;
  }

  async clientContestDelivery(parcelId: string, reason: string) {
    const response = await this.api.post('/delivery/client-contest', { parcelId, reason });
    return response.data;
  }

  async getDeliveryStatus(parcelId: string) {
    const response = await this.api.get(`/delivery/status/${parcelId}`);
    return response.data;
  }

  // === Tips (Pourboires) ===
  async createTip(parcelId: string, amount: number, message?: string) {
    const response = await this.api.post('/tips', { parcelId, amount, message });
    return response.data;
  }

  async getTipByParcel(parcelId: string) {
    const response = await this.api.get(`/tips/parcel/${parcelId}`);
    return response.data;
  }

  async getTipsReceived(page: number = 1, limit: number = 10) {
    const response = await this.api.get('/tips/received', { params: { page, limit } });
    return response.data;
  }

  async getTipsGiven(page: number = 1, limit: number = 10) {
    const response = await this.api.get('/tips/given', { params: { page, limit } });
    return response.data;
  }
}

export const api = new ApiService();
