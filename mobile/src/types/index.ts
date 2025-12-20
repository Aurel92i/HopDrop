export type UserRole = 'VENDOR' | 'CARRIER' | 'BOTH';

export type ParcelSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

export type ParcelStatus = 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED';

export type MissionStatus = 'ACCEPTED' | 'IN_PROGRESS' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

export type Carrier = 'VINTED' | 'MONDIAL_RELAY' | 'COLISSIMO' | 'CHRONOPOST' | 'RELAIS_COLIS' | 'UPS' | 'OTHER';

export type PickupMode = 'SCHEDULED' | 'IMMEDIATE';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  emailVerified: boolean;
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
  carrierId: string | null;
  pickupAddressId: string;
  dropoffType: 'POST_OFFICE' | 'RELAY_POINT' | 'OTHER';
  dropoffName: string;
  dropoffAddress: string;
  size: ParcelSize;
  weightEstimate: number | null;
  description: string | null;
  photoUrl: string | null;
  status: ParcelStatus;
  price: number;
  pickupSlotStart: string;
  pickupSlotEnd: string;
  pickupCode: string;
  pickupAddress?: Address;
  carrier?: User;
  vendor?: User;
  export interface Parcel {
  // ... champs existants ...
  pickupMode: PickupMode;  // AJOUTER
  // ... reste des champs ...
}
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

// Mets à jour l'interface Parcel (ajoute ces 3 champs)
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
  carrier: Carrier;           // NOUVEAU
  hasShippingLabel: boolean;  // NOUVEAU
  shippingLabelUrl?: string;  // NOUVEAU
  status: ParcelStatus;
  price: number;
  pickupSlotStart: string;
  pickupSlotEnd: string;
  pickupCode: string;
  createdAt: string;
  updatedAt: string;
  pickupAddress?: Address;
  vendor?: User;
  assignedCarrier?: User;
}