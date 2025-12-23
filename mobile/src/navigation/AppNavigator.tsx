import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VendorHistoryScreen } from '../screens/vendor/VendorHistoryScreen';
import { CarrierHistoryScreen } from '../screens/carrier/CarrierHistoryScreen';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../theme';
import { ReviewScreen } from '../screens/shared/ReviewScreen';
import { CarrierProfileScreen } from '../screens/carrier/CarrierProfileScreen';

import {
  AuthStackParamList,
  VendorStackParamList,
  CarrierStackParamList,
  ProfileStackParamList,
  AdminStackParamList,
} from './types';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

// Vendor Screens
import { VendorHomeScreen } from '../screens/vendor/VendorHomeScreen';
import { CreateParcelScreen } from '../screens/vendor/CreateParcelScreen';
import { ParcelDetailScreen } from '../screens/vendor/ParcelDetailScreen';
import { TrackingScreen } from '../screens/vendor/TrackingScreen';

// Carrier Screens
import { CarrierHomeScreen } from '../screens/carrier/CarrierHomeScreen';
import { AvailableMissionsScreen } from '../screens/carrier/AvailableMissionsScreen';
import { MissionDetailScreen } from '../screens/carrier/MissionDetailScreen';
import { CarrierDocumentsScreen } from '../screens/carrier/CarrierDocumentsScreen';

// Admin Screens
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';

// Shared Screens
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { AddressesScreen } from '../screens/shared/AddressesScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

// Chat Screens
import { ChatScreen } from '../screens/chat/ChatScreen';

// Navigators
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const VendorStack = createNativeStackNavigator<VendorStackParamList>();
const CarrierStack = createNativeStackNavigator<CarrierStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
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
    <VendorStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
      }}
    >
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
      <VendorStack.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{ title: 'Suivi du livreur' }}
      />
      <VendorStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat' }}
      />
      <VendorStack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ title: 'Laisser un avis' }}
      />  
    </VendorStack.Navigator>
  );
}

// Carrier Navigator
function CarrierNavigator() {
  return (
    <CarrierStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
      }}
    >
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
        name="CarrierDocuments"
        component={CarrierDocumentsScreen}
        options={{ title: 'Mes documents' }}
      />
      <CarrierStack.Screen
        name="CarrierHistory"
        component={CarrierHistoryScreen}
        options={{ title: 'Historique' }}
      />
      <CarrierStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat' }}
      />
      <CarrierStack.Screen
        name="CarrierProfile"
        component={CarrierProfileScreen}
        options={{ title: 'Mon profil livreur' }}
      />
    </CarrierStack.Navigator>
  );
}

// Profile Navigator
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
      }}
    >
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
      <ProfileStack.Screen
        name="CarrierDocuments"
        component={CarrierDocumentsScreen}
        options={{ title: 'Mes Documents' }}
      />
    </ProfileStack.Navigator>
  );
}

// Admin Navigator
function AdminNavigator() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
      }}
    >
      <AdminStack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Administration' }}
      />
    </AdminStack.Navigator>
  );
}

// Main Navigator
function MainNavigator() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const isCarrier = user?.role === 'CARRIER' || user?.role === 'BOTH';
  const isVendor = user?.role === 'VENDOR' || user?.role === 'BOTH';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
        },
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
      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminNavigator}
          options={{
            title: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="shield-crown" size={size} color={color} />
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
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}