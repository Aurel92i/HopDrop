import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../stores/authStore';

// Placeholder screens (on les créera après)
import { View, Text, ActivityIndicator } from 'react-native';

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>{name}</Text>
  </View>
);

// Auth Screens
const LoginScreen = () => <PlaceholderScreen name="Login" />;
const RegisterScreen = () => <PlaceholderScreen name="Register" />;
const ForgotPasswordScreen = () => <PlaceholderScreen name="ForgotPassword" />;

// Vendor Screens
const VendorHomeScreen = () => <PlaceholderScreen name="VendorHome" />;
const CreateParcelScreen = () => <PlaceholderScreen name="CreateParcel" />;
const ParcelDetailScreen = () => <PlaceholderScreen name="ParcelDetail" />;
const VendorHistoryScreen = () => <PlaceholderScreen name="VendorHistory" />;

// Carrier Screens
const CarrierHomeScreen = () => <PlaceholderScreen name="CarrierHome" />;
const AvailableMissionsScreen = () => <PlaceholderScreen name="AvailableMissions" />;
const MissionDetailScreen = () => <PlaceholderScreen name="MissionDetail" />;
const CarrierHistoryScreen = () => <PlaceholderScreen name="CarrierHistory" />;

// Shared Screens
const ProfileScreen = () => <PlaceholderScreen name="Profile" />;
const AddressesScreen = () => <PlaceholderScreen name="Addresses" />;
const SettingsScreen = () => <PlaceholderScreen name="Settings" />;

// Types
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
  CarrierHistory: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Addresses: undefined;
  Settings: undefined;
};

// Navigators
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const VendorStack = createNativeStackNavigator<VendorStackParamList>();
const CarrierStack = createNativeStackNavigator<CarrierStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator();

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Vendor Navigator
function VendorNavigator() {
  return (
    <VendorStack.Navigator>
      <VendorStack.Screen 
        name="VendorHome" 
        component={VendorHomeScreen}
        options={{ title: 'Mes Colis' }}
      />
      <VendorStack.Screen 
        name="CreateParcel" 
        component={CreateParcelScreen}
        options={{ title: 'Nouveau Colis' }}
      />
      <VendorStack.Screen 
        name="ParcelDetail" 
        component={ParcelDetailScreen}
        options={{ title: 'Détail du Colis' }}
      />
      <VendorStack.Screen 
        name="VendorHistory" 
        component={VendorHistoryScreen}
        options={{ title: 'Historique' }}
      />
    </VendorStack.Navigator>
  );
}

// Carrier Navigator
function CarrierNavigator() {
  return (
    <CarrierStack.Navigator>
      <CarrierStack.Screen 
        name="CarrierHome" 
        component={CarrierHomeScreen}
        options={{ title: 'Missions' }}
      />
      <CarrierStack.Screen 
        name="AvailableMissions" 
        component={AvailableMissionsScreen}
        options={{ title: 'Missions Disponibles' }}
      />
      <CarrierStack.Screen 
        name="MissionDetail" 
        component={MissionDetailScreen}
        options={{ title: 'Détail Mission' }}
      />
      <CarrierStack.Screen 
        name="CarrierHistory" 
        component={CarrierHistoryScreen}
        options={{ title: 'Historique' }}
      />
    </CarrierStack.Navigator>
  );
}

// Profile Navigator
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Mon Profil' }}
      />
      <ProfileStack.Screen 
        name="Addresses" 
        component={AddressesScreen}
        options={{ title: 'Mes Adresses' }}
      />
      <ProfileStack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Paramètres' }}
      />
    </ProfileStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const isCarrier = user?.role === 'CARRIER' || user?.role === 'BOTH';
  const isVendor = user?.role === 'VENDOR' || user?.role === 'BOTH';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
      }}
    >
      {isVendor && (
        <Tab.Screen
          name="VendorTab"
          component={VendorNavigator}
          options={{
            title: 'Colis',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="package-variant" size={size} color={color} />
            ),
          }}
        />
      )}
      {isCarrier && (
        <Tab.Screen
          name="CarrierTab"
          component={CarrierNavigator}
          options={{
            title: 'Missions',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="bike" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export function AppNavigator() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  React.useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}