// mobile/src/navigation/types.ts

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type VendorStackParamList = {
  VendorHome: undefined;
  CreateParcel: undefined;
  ParcelDetail: { parcelId: string };
  VendorHistory: undefined;
  Tracking: { parcelId: string; carrierId: string };
  Chat: { parcelId: string };
  Review: { parcelId: string; carrierName?: string; dropoffName?: string };
  Payment: { parcelId: string };
};

export type CarrierStackParamList = {
  CarrierHome: undefined;
  AvailableMissions: undefined;
  MissionDetail: { missionId: string };
  CarrierDocuments: undefined;
  CarrierHistory: undefined;
  CarrierProfile: undefined;
  Chat: { parcelId: string };
  ActiveMissions: undefined;
  TransactionHistory: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Addresses: undefined;
  Settings: undefined;
  CarrierDocuments: undefined;
  TransactionHistory: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
};

export type ChatStackParamList = {
  ConversationsList: undefined;
  Chat: { parcelId: string };
};

// Type utilitaire pour toutes les routes
export type RootStackParamList = AuthStackParamList &
  VendorStackParamList &
  CarrierStackParamList &
  ProfileStackParamList &
  AdminStackParamList;