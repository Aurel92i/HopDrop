import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/theme';
import { notificationService } from './src/services/notifications';
import { I18nProvider } from './src/i18n/i18nContext';
import { useFonts, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51TAEIeLDRXHAZGFenveXlaFKG7q9XuodVTRj47FpmvN0ybZzkGvpaObKgH9deujvMWvj7niJ9djLFjMm0J9iN1BD00lS0gZaVD';

export default function App() {
  const [fontsLoaded] = useFonts({
    Quicksand_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    notificationService.initialize();
    const receivedSubscription = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification reçue:', notification);
      }
    );
    const responseSubscription = notificationService.addNotificationResponseListener(
      (response) => {
        console.log('Notification cliquée:', response);
      }
    );
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <I18nProvider>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.hopdrop.app"
      >
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <StatusBar style="auto" />
            <AppNavigator />
          </PaperProvider>
        </SafeAreaProvider>
      </StripeProvider>
    </I18nProvider>
  );
}