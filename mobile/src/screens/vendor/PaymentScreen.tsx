import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';

import { VendorStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { api } from '../../services/api';
import { useTranslation } from '../../i18n/i18nContext';

type PaymentScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'Payment'>;
  route: RouteProp<VendorStackParamList, 'Payment'>;
};

export function PaymentScreen({ navigation, route }: PaymentScreenProps) {
  const { parcelId, amount, clientSecret, paymentIntentId } = route.params;
  const { t } = useTranslation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parcel, setParcel] = useState<any>(null);
  const [sheetReady, setSheetReady] = useState(false);

  useEffect(() => {
    loadParcelAndInitSheet();
  }, []);

  const loadParcelAndInitSheet = async () => {
    try {
      const data = await api.getParcel(parcelId);
      setParcel(data);

      console.log('=== PAYMENT SCREEN ===', { clientSecret: !!clientSecret, sheetReady });
      if (clientSecret) {
        const { error } = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'HopDrop',
          style: 'automatic',
          applePay: {
            merchantCountryCode: 'FR',
          },
          googlePay: {
            merchantCountryCode: 'FR',
            testEnv: true,
          },
        });

        if (!error) {
          setSheetReady(true);
        } else {
          console.error('Erreur init PaymentSheet:', JSON.stringify(error));
        }
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async () => {
    // Si pas de clientSecret valide, fallback simulation
    if (!clientSecret || !sheetReady) {
      await handleSimulatedPayment();
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          // L'utilisateur a annule
          return;
        }
        Alert.alert(t('vendor.payment.paymentFailed'), error.message);
        return;
      }

      // Paiement reussi - confirmer cote backend
      if (paymentIntentId) {
        try {
          await api.confirmPayment(paymentIntentId);
        } catch (e) {
          console.log('Confirm API fallback:', e);
        }
      }

      Alert.alert(
        t('vendor.payment.successTitle'),
        t('vendor.payment.successDesc').replace('{amount}', amount.toFixed(2)),
        [
          {
            text: t('vendor.payment.viewParcel'),
            onPress: () => {
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'VendorHome' },
                  { name: 'ParcelDetail', params: { parcelId } },
                ],
              });
            },
          },
          {
            text: t('vendor.payment.backToHome'),
            onPress: () => navigation.navigate('VendorHome'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('vendor.payment.paymentFailed'), error.message || t('common.genericError'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Fallback mode test
  const handleSimulatedPayment = async () => {
    setIsProcessing(true);
    try {
      await api.simulatePayment(parcelId);
      Alert.alert(
        t('vendor.payment.successTitle'),
        t('vendor.payment.successDesc').replace('{amount}', amount.toFixed(2)),
        [
          {
            text: t('vendor.payment.viewParcel'),
            onPress: () => {
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'VendorHome' },
                  { name: 'ParcelDetail', params: { parcelId } },
                ],
              });
            },
          },
          {
            text: t('vendor.payment.backToHome'),
            onPress: () => navigation.navigate('VendorHome'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('vendor.payment.paymentFailed'), error.message || t('common.genericError'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Resume de la commande */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>{t('vendor.payment.summary')}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('vendor.payment.parcel')}</Text>
            <Text style={styles.summaryValue}>{parcel?.description || t('vendor.payment.parcel')}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('vendor.payment.size')}</Text>
            <Text style={styles.summaryValue}>{parcel?.size || 'M'}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('vendor.payment.deliverTo')}</Text>
            <Text style={styles.summaryValue}>{parcel?.dropoffName || 'Point relais'}</Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('vendor.payment.total')}</Text>
            <Text style={styles.totalAmount}>{amount.toFixed(2)} €</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Info pre-autorisation */}
      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          {t('vendor.payment.preauthInfo').replace('{amount}', amount.toFixed(2))}
        </Text>
      </View>

      {/* Securite */}
      <View style={styles.securityInfo}>
        <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" />
        <Text style={styles.securityText}>
          {t('vendor.payment.securedPayment')}
        </Text>
      </View>

      {/* Bouton de paiement */}
      <TouchableOpacity
        style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
        onPress={handlePay}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <MaterialCommunityIcons name="lock" size={20} color="white" />
            <Text style={styles.payButtonText}>
              {t('vendor.payment.pay')} {amount.toFixed(2)} €
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Mode test fallback */}
      {!clientSecret && (
        <View style={styles.testBadge}>
          <MaterialCommunityIcons name="test-tube" size={16} color="#92400E" />
          <Text style={styles.testBadgeText}>{t('vendor.payment.testMode')}</Text>
        </View>
      )}

      <Text style={styles.legalText}>
        {t('vendor.payment.legalPaymentText')}
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#6B7280' },

  summaryCard: { marginBottom: 16, borderRadius: 16, elevation: 2 },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '500', color: '#374151' },
  divider: { marginVertical: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  totalAmount: { fontSize: 24, fontWeight: '800', color: colors.primary },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: colors.primaryContainer || '#DBEAFE',
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },

  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  securityText: { fontSize: 13, color: '#6B7280' },

  payButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
  },
  payButtonDisabled: { backgroundColor: '#9CA3AF' },
  payButtonText: { fontSize: 17, fontWeight: '700', color: 'white' },

  testBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignSelf: 'center',
    marginBottom: 16,
  },
  testBadgeText: { fontSize: 13, fontWeight: '600', color: '#92400E' },

  legalText: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
});