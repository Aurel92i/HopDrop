export type UserRole = 'VENDOR' | 'CARRIER' | 'BOTH';

export type ParcelSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

export type ParcelStatus = 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED';

export type MissionStatus = 'ACCEPTED' | 'IN_PROGRESS' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

export type Carrier = 'VINTED' | 'MONDIAL_RELAY' | 'COLISSIMO' | 'CHRONOPOST' | 'RELAIS_COLIS' | 'UPS' | 'OTHER';

export type PickupMode = 'SCHEDULED' | 'IMMEDIATE';

export type DocumentType = 'ID_CARD_FRONT' | 'ID_CARD_BACK' | 'KBIS' | 'VEHICLE_REGISTRATION';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type VehicleType = 'NONE' | 'BIKE' | 'SCOOTER' | 'CAR';

export interface CarrierDocument {
  type: DocumentType;
  required: boolean;
  uploaded: boolean;
  status: DocumentStatus | null;
  fileUrl: string | null;
  rejectionReason: string | null;
}

export interface CarrierProfileInfo {
  vehicleType: VehicleType;
  hasOwnPrinter: boolean;
  documentsVerified: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  emailVerified: boolean;
  pushToken?: string | null;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  instructions: string | null;
  isDefault: boolean;
}

export interface Parcel {
  id: string;
  vendorId: string;
  assignedCarrierId?: string;
  pickupAddressId: string;
  dropoffType: 'POST_OFFICE' | 'RELAY_POINT' | 'OTHER';
  dropoffName: string;
  dropoffAddress: string;
  size: ParcelSize;
  weightEstimate?: number;
  description?: string;
  photoUrl?: string;
  carrier: Carrier;
  hasShippingLabel: boolean;
  shippingLabelUrl?: string;
  qrCodeUrl?: string;
  pickupMode: PickupMode;
  status: ParcelStatus;
  price: number;
  pickupSlotStart: string;
  pickupSlotEnd: string;
  pickupInstructions?: string;
  pickupCode: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  pickupAddress?: Address;
  vendor?: User;
  assignedCarrier?: User;
  
  // Photo article (IA)
  itemPhotoUrl?: string;
  itemCategory?: string;
  suggestedSize?: ParcelSize;
  
  // ===== EMBALLAGE =====
  packagingPhotoUrl?: string;           // Photo de l'emballage prise par le livreur
  packagingConfirmedAt?: string;        // Date de confirmation par le livreur
  vendorPackagingConfirmedAt?: string;  // Date de confirmation par le vendeur
  packagingRejectedAt?: string;         // Date de refus par le vendeur
  packagingRejectionReason?: string;    // Raison du refus
  
  // Avis
  reviews?: Review[];
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Mission {
  id: string;
  parcelId: string;
  carrierId: string;
  status: MissionStatus;
  acceptedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  proofPhotoUrl: string | null;
  carrierNotes: string | null;
  
  // Tracking temps réel
  departedAt?: string | null;
  arrivedAt?: string | null;
  estimatedArrival?: string | null;
  
  // Relation
  parcel?: Parcel;
}

export interface CarrierProfile {
  id: string;
  userId: string;
  isAvailable: boolean;
  coverageRadiusKm: number;
  currentLatitude: number | null;
  currentLongitude: number | null;
  stripeAccountId: string | null;
  stripeAccountStatus: string | null;
  identityVerified: boolean;
  totalDeliveries: number;
  averageRating: number | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AdminStats {
  users: {
    total: number;
    carriers: number;
    vendors: number;
  };
  documents: {
    pending: number;
    approved: number;
    rejected: number;
  };
  carriers: {
    verified: number;
    total: number;
  };
  parcels: {
    total: number;
    delivered: number;
  };
}

export interface PendingDocument {
  id: string;
  carrierId: string;
  type: DocumentType;
  fileUrl: string;
  status: DocumentStatus;
  uploadedAt: string;
  carrier: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    avatarUrl: string | null;
  };
}

export interface Conversation {
  id: string;
  parcelId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  parcel: {
    id: string;
    status: ParcelStatus;
    dropoffName: string;
    vendor: {
      id: string;
      firstName: string;
      avatarUrl: string | null;
    };
    assignedCarrier: {
      id: string;
      firstName: string;
      avatarUrl: string | null;
    } | null;
  };
  unreadCount?: number;
  lastMessage?: Message | null;
}

// ===== PACKAGING STATUS =====
export interface PackagingStatus {
  status: 'PENDING' | 'CARRIER_CONFIRMED' | 'FULLY_CONFIRMED' | 'REJECTED';
  photoUrl: string | null;
  carrierConfirmedAt: string | null;
  vendorConfirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}