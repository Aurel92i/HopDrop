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
};

export type CarrierStackParamList = {
  CarrierHome: undefined;
  AvailableMissions: undefined;
  MissionDetail: { missionId: string };
  CarrierDocuments: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Addresses: undefined;
  Settings: undefined;
  CarrierDocuments: undefined;  // Ajouté pour accès depuis le profil
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
};