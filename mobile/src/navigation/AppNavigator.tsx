import React, { useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Platform, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../stores/authStore';
import { hdColors } from '../theme';
import { useTranslation } from '../i18n/i18nContext';

import {
  AuthStackParamList,
  VendorStackParamList,
  CarrierStackParamList,
  ProfileStackParamList,
  AdminStackParamList,
} from './types';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';

import { VendorHomeScreen } from '../screens/vendor/VendorHomeScreen';
import { CreateParcelScreen } from '../screens/vendor/CreateParcelScreen';
import { ParcelDetailScreen } from '../screens/vendor/ParcelDetailScreen';
import { TrackingScreen } from '../screens/vendor/TrackingScreen';
import { VendorHistoryScreen } from '../screens/vendor/VendorHistoryScreen';
import { PaymentScreen } from '../screens/vendor/PaymentScreen';

import { CarrierHomeScreen } from '../screens/carrier/CarrierHomeScreen';
import { AvailableMissionsScreen } from '../screens/carrier/AvailableMissionsScreen';
import { MissionDetailScreen } from '../screens/carrier/MissionDetailScreen';
import { CarrierDocumentsScreen } from '../screens/carrier/CarrierDocumentsScreen';
import { CarrierHistoryScreen } from '../screens/carrier/CarrierHistoryScreen';
import { CarrierProfileScreen } from '../screens/carrier/CarrierProfileScreen';
import { ActiveMissionsScreen } from '../screens/carrier/ActiveMissionsScreen';
import { TransactionHistoryScreen } from '../screens/carrier/TransactionHistoryScreen';

import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';

import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { AddressesScreen } from '../screens/shared/AddressesScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';
import { ReviewScreen } from '../screens/shared/ReviewScreen';
import { SplashScreen } from '../screens/shared/SplashScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { ConversationsScreen } from '../screens/chat/ConversationsScreen';
import { LegalScreen } from '../screens/shared/LegalScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const VendorStack = createNativeStackNavigator<VendorStackParamList>();
const CarrierStack = createNativeStackNavigator<CarrierStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const SettingsStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DummyScreen() {
  return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function VendorNavigator() {
  const { t } = useTranslation();
  return (
    <VendorStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: hdColors.surface },
        headerTintColor: hdColors.text,
        headerShadowVisible: false,
      }}
    >
      <VendorStack.Screen name="VendorHome" component={VendorHomeScreen} options={{ title: 'Mes colis' }} />
      <VendorStack.Screen name="CreateParcel" component={CreateParcelScreen} options={{ title: t('nav.createParcel') }} />
      <VendorStack.Screen name="ParcelDetail" component={ParcelDetailScreen} options={{ title: t('nav.parcelDetail') }} />
      <VendorStack.Screen name="VendorHistory" component={VendorHistoryScreen} options={{ title: t('nav.vendorHistory') }} />
      <VendorStack.Screen name="Tracking" component={TrackingScreen} options={{ title: t('nav.tracking') }} />
      <VendorStack.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.chat') }} />
      <VendorStack.Screen name="Review" component={ReviewScreen} options={{ title: t('nav.review') }} />
      <VendorStack.Screen name="Payment" component={PaymentScreen} options={{ title: t('nav.payment') }} />
      <VendorStack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: 'Vérification email' }} />
    </VendorStack.Navigator>
  );
}

function CarrierNavigator() {
  const { t } = useTranslation();
  return (
    <CarrierStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: hdColors.surface },
        headerTintColor: hdColors.text,
        headerShadowVisible: false,
      }}
    >
      <CarrierStack.Screen name="CarrierHome" component={CarrierHomeScreen} options={{ title: t('nav.carrierHome') }} />
      <CarrierStack.Screen name="AvailableMissions" component={AvailableMissionsScreen} options={{ title: t('nav.availableMissions') }} />
      <CarrierStack.Screen name="MissionDetail" component={MissionDetailScreen} options={{ title: t('nav.missionDetail') }} />
      <CarrierStack.Screen name="CarrierDocuments" component={CarrierDocumentsScreen} options={{ title: t('nav.carrierDocuments') }} />
      <CarrierStack.Screen name="CarrierHistory" component={CarrierHistoryScreen} options={{ title: t('nav.carrierHistory') }} />
      <CarrierStack.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.chat') }} />
      <CarrierStack.Screen name="CarrierProfile" component={CarrierProfileScreen} options={{ title: t('nav.carrierProfile') }} />
      <CarrierStack.Screen name="ActiveMissions" component={ActiveMissionsScreen} options={{ title: t('nav.activeMissions') }} />
      <CarrierStack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ title: t('nav.transactionHistory') }} />
      <CarrierStack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ title: 'Vérification email' }} />
    </CarrierStack.Navigator>
  );
}

function MessagesNavigator() {
  return (
    <MessagesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: hdColors.surface },
        headerTintColor: hdColors.text,
        headerShadowVisible: false,
      }}
    >
      <MessagesStack.Screen name="MessagesList" component={ConversationsScreen} options={{ title: 'Messages' }} />
      <MessagesStack.Screen name="Chat" component={ChatScreen} options={({ route }: any) => ({ title: route.params?.carrierName || 'Conversation' })} />
    </MessagesStack.Navigator>
  );
}

function ProfileNavigator() {
  const { t } = useTranslation();
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: hdColors.surface },
        headerTintColor: hdColors.text,
        headerShadowVisible: false,
      }}
    >
      <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile') }} />
      <ProfileStack.Screen name="Addresses" component={AddressesScreen} options={{ title: t('nav.addresses') }} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
      <ProfileStack.Screen name="CarrierDocuments" component={CarrierDocumentsScreen} options={{ title: t('nav.documents') }} />
      <ProfileStack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ title: t('nav.transactions') }} />
      <ProfileStack.Screen name="Legal" component={LegalScreen} options={{ title: t('nav.legal') }} />
    </ProfileStack.Navigator>
  );
}

function SettingsNavigator() {
  const { t } = useTranslation();
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: hdColors.surface },
        headerTintColor: hdColors.text,
        headerShadowVisible: false,
      }}
    >
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} options={{ title: 'Paramètres' }} />
      <SettingsStack.Screen name="Legal" component={LegalScreen} options={{ title: t('nav.legal') }} />
    </SettingsStack.Navigator>
  );
}

function AdminNavigator() {
  const { t } = useTranslation();
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: hdColors.surface },
        headerTintColor: hdColors.text,
        headerShadowVisible: false,
      }}
    >
      <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: t('nav.adminDashboard') }} />
    </AdminStack.Navigator>
  );
}

function MainNavigator() {
  const { user } = useAuthStore();
  const isCarrier = user?.role === 'CARRIER' || user?.role === 'BOTH';
  const isVendor = user?.role === 'VENDOR' || user?.role === 'BOTH';
  const isAdmin = user?.role === 'ADMIN';

  // Déterminer l'action du bouton central
  const getCenterAction = (navigation: any) => {
    if (isVendor) {
      // Vendeur → créer un colis
      if (user && !user.emailVerified) {
        Alert.alert(
          'Email non vérifié',
          'Vous devez vérifier votre adresse email avant de créer un colis.',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Vérifier', onPress: () => navigation.navigate('VendorTab', { screen: 'EmailVerification' }) },
          ]
        );
        return;
      }
      navigation.navigate('VendorTab', { screen: 'CreateParcel' });
    } else if (isCarrier) {
      // Carrier → missions disponibles
      navigation.navigate('CarrierTab', { screen: 'AvailableMissions' });
    }
  };

  // Icône du bouton central
  const centerIcon = isVendor ? 'plus' : 'radar';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.tabBar,
        tabBarActiveTintColor: hdColors.accent,
        tabBarInactiveTintColor: hdColors.textTertiary,
        tabBarLabelStyle: tabStyles.tabLabel,
        tabBarItemStyle: tabStyles.tabItem,
      }}
    >
      {/* Tab 1 — Colis (vendeur) ou Carte (carrier) */}
      {isVendor && (
        <Tab.Screen
          name="VendorTab"
          component={VendorNavigator}
          options={{
            title: 'Colis',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="package-variant" size={22} color={color} />
            ),
          }}
        />
      )}

      {isCarrier && !isVendor && (
        <Tab.Screen
          name="CarrierTab"
          component={CarrierNavigator}
          options={{
            title: 'Carte',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? tabStyles.tabIconActive : undefined}>
                <MaterialCommunityIcons
                  name={focused ? 'map' : 'map-outline'}
                  size={22}
                  color={focused ? '#FFFFFF' : color}
                />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <Text style={[tabStyles.tabLabel, { color: focused ? hdColors.accent : hdColors.textTertiary }]}>
                Carte
              </Text>
            ),
          }}
        />
      )}

      {/* Tab 2 — Messages */}
      <Tab.Screen
        name="MessagesTab"
        component={MessagesNavigator}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="chat-outline" size={22} color={color} />
          ),
        }}
      />

      {/* Tab 3 — Bouton central */}
      <Tab.Screen
        name="CreateTab"
        component={DummyScreen}
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <View style={tabStyles.centerContainer}>
              <TouchableOpacity
                style={tabStyles.centerBtn}
                activeOpacity={0.85}
                onPress={props.onPress}
              >
                <MaterialCommunityIcons name={centerIcon} size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            getCenterAction(navigation);
          },
        })}
      />

      {/* Tab 4 — Profil */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account" size={22} color={color} />
          ),
        }}
      />

      {/* Tab 5 — Réglages */}
      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{
          title: 'Réglages',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cog-outline" size={22} color={color} />
          ),
        }}
      />

      {/* Tabs supplémentaires */}
      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminNavigator}
          options={{
            title: 'Admin',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="shield-crown" size={22} color={color} />
            ),
          }}
        />
      )}

      {isCarrier && isVendor && (
        <Tab.Screen
          name="CarrierTab"
          component={CarrierNavigator}
          options={{
            title: 'Courses',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? tabStyles.tabIconActive : undefined}>
                <MaterialCommunityIcons
                  name={focused ? 'map' : 'map-outline'}
                  size={22}
                  color={focused ? '#FFFFFF' : color}
                />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <Text style={[tabStyles.tabLabel, { color: focused ? hdColors.accent : hdColors.textTertiary }]}>
                Courses
              </Text>
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);

  React.useEffect(() => {
    checkAuth();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: hdColors.background }}>
        <ActivityIndicator size="large" color={hdColors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: hdColors.surface,
    borderTopWidth: 0.5,
    borderTopColor: hdColors.border,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    width: 40,
    height: 28,
    borderRadius: 14,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -12,
    ...Platform.select({
      ios: {
        shadowColor: hdColors.accent,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 5 },
    }),
  },
});

export type { AuthStackParamList };