import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/theme';
import { notificationService } from './src/services/notifications';

export default function App() {
  useEffect(() => {
    // Initialiser les notifications
    notificationService.initialize();

    // Écouter les notifications reçues
    const receivedSubscription = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('📩 Notification reçue:', notification);
      }
    );

    // Écouter les clics sur les notifications
    const responseSubscription = notificationService.addNotificationResponseListener(
      (response) => {
        console.log('👆 Notification cliquée:', response);
        // TODO: Naviguer vers l'écran approprié selon response.notification.request.content.data
      }
    );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}