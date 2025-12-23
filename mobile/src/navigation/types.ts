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
};

export type CarrierStackParamList = {
  CarrierHome: undefined;
  AvailableMissions: undefined;
  MissionDetail: { missionId: string };
  CarrierDocuments: undefined;
  CarrierHistory: undefined;
  Chat: { parcelId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Addresses: undefined;
  Settings: undefined;
  CarrierDocuments: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
};

export type ChatStackParamList = {
  ConversationsList: undefined;
  Chat: { parcelId: string };
};