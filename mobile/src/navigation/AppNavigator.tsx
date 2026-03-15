// mobile/src/navigation/AppNavigator.tsx

import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../stores/authStore';
import { colors } from '../theme';
import { useTranslation } from '../i18n/i18nContext';

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
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';

// Vendor Screens
import { VendorHomeScreen } from '../screens/vendor/VendorHomeScreen';
import { CreateParcelScreen } from '../screens/vendor/CreateParcelScreen';
import { ParcelDetailScreen } from '../screens/vendor/ParcelDetailScreen';
import { TrackingScreen } from '../screens/vendor/TrackingScreen';
import { VendorHistoryScreen } from '../screens/vendor/VendorHistoryScreen';
import { PaymentScreen } from '../screens/vendor/PaymentScreen';

// Carrier Screens
import { CarrierHomeScreen } from '../screens/carrier/CarrierHomeScreen';
import { AvailableMissionsScreen } from '../screens/carrier/AvailableMissionsScreen';
import { MissionDetailScreen } from '../screens/carrier/MissionDetailScreen';
import { CarrierDocumentsScreen } from '../screens/carrier/CarrierDocumentsScreen';
import { CarrierHistoryScreen } from '../screens/carrier/CarrierHistoryScreen';
import { CarrierProfileScreen } from '../screens/carrier/CarrierProfileScreen';
import { ActiveMissionsScreen } from '../screens/carrier/ActiveMissionsScreen';
import { TransactionHistoryScreen } from '../screens/carrier/TransactionHistoryScreen';

// Admin Screens
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';

// Shared Screens
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { AddressesScreen } from '../screens/shared/AddressesScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';
import { ReviewScreen } from '../screens/shared/ReviewScreen';
import { SplashScreen } from '../screens/shared/SplashScreen';

// Chat Screens
import { ChatScreen } from '../screens/chat/ChatScreen';
import { LegalScreen } from '../screens/shared/LegalScreen';

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
  const { t } = useTranslation();
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
        options={{ title: t('nav.vendorHome') }}
      />
      <VendorStack.Screen
        name="CreateParcel"
        component={CreateParcelScreen}
        options={{ title: t('nav.createParcel') }}
      />
      <VendorStack.Screen
        name="ParcelDetail"
        component={ParcelDetailScreen}
        options={{ title: t('nav.parcelDetail') }}
      />
      <VendorStack.Screen
        name="VendorHistory"
        component={VendorHistoryScreen}
        options={{ title: t('nav.vendorHistory') }}
      />
      <VendorStack.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{ title: t('nav.tracking') }}
      />
      <VendorStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: t('nav.chat') }}
      />
      <VendorStack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ title: t('nav.review') }}
      />
      <VendorStack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: t('nav.payment') }}
      />
      <VendorStack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{ title: 'Vérification email' }}
      />
    </VendorStack.Navigator>
  );
}

// Carrier Navigator
function CarrierNavigator() {
  const { t } = useTranslation();
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
        options={{ title: t('nav.carrierHome') }}
      />
      <CarrierStack.Screen
        name="AvailableMissions"
        component={AvailableMissionsScreen}
        options={{ title: t('nav.availableMissions') }}
      />
      <CarrierStack.Screen
        name="MissionDetail"
        component={MissionDetailScreen}
        options={{ title: t('nav.missionDetail') }}
      />
      <CarrierStack.Screen
        name="CarrierDocuments"
        component={CarrierDocumentsScreen}
        options={{ title: t('nav.carrierDocuments') }}
      />
      <CarrierStack.Screen
        name="CarrierHistory"
        component={CarrierHistoryScreen}
        options={{ title: t('nav.carrierHistory') }}
      />
      <CarrierStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: t('nav.chat') }}
      />
      <CarrierStack.Screen
        name="CarrierProfile"
        component={CarrierProfileScreen}
        options={{ title: t('nav.carrierProfile') }}
      />
      <CarrierStack.Screen
        name="ActiveMissions"
        component={ActiveMissionsScreen}
        options={{ title: t('nav.activeMissions') }}
      />
      <CarrierStack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ title: t('nav.transactionHistory') }}
      />
      <CarrierStack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{ title: 'Vérification email' }}
      />
    </CarrierStack.Navigator>
  );
}

// Profile Navigator
function ProfileNavigator() {
  const { t } = useTranslation();
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
        options={{ title: t('nav.profile') }}
      />
      <ProfileStack.Screen
        name="Addresses"
        component={AddressesScreen}
        options={{ title: t('nav.addresses') }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('nav.settings') }}
      />
      <ProfileStack.Screen
        name="CarrierDocuments"
        component={CarrierDocumentsScreen}
        options={{ title: t('nav.documents') }}
      />
      <ProfileStack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ title: t('nav.transactions') }}
      />
      <ProfileStack.Screen
        name="Legal"
        component={LegalScreen}
        options={{ title: t('nav.legal') }}
      />
    </ProfileStack.Navigator>
  );
}

// Admin Navigator
function AdminNavigator() {
  const { t } = useTranslation();
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
        options={{ title: t('nav.adminDashboard') }}
      />
    </AdminStack.Navigator>
  );
}

// Main Navigator
function MainNavigator() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { t } = useTranslation();
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
            title: t('nav.tab.vendor'),
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
            title: t('nav.tab.carrier'),
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
            title: t('nav.tab.admin'),
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
          title: t('nav.tab.profile'),
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
  const [showSplash, setShowSplash] = useState(true);

  React.useEffect(() => {
    checkAuth();
  }, []);

  // Afficher le Splash Screen au démarrage
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

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