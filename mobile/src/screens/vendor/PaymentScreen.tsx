// mobile/src/screens/vendor/PaymentScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, Button, TextInput, Divider, ActivityIndicator } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VendorStackParamList } from '../../navigation/types';
import { api, PRICING } from '../../services/api';
import { colors, spacing } from '../../theme';
import { Parcel } from '../../types';

type PaymentScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'Payment'>;
  route: RouteProp<VendorStackParamList, 'Payment'>;
};

type PaymentMethod = 'card' | 'apple_pay' | 'google_pay';

export function PaymentScreen({ navigation, route }: PaymentScreenProps) {
  const { parcelId } = route.params;
  
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  
  // Champs carte (pour démo - sera remplacé par Stripe Elements)
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    loadParcel();
  }, [parcelId]);

  const loadParcel = async () => {
    try {
      const data = await api.getParcel(parcelId);
      setParcel(data);
    } catch (error) {
      console.error('Erreur chargement colis:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du colis');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19);
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validateCard = (): boolean => {
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      Alert.alert('Erreur', 'Numéro de carte invalide');
      return false;
    }
    if (expiry.length !== 5) {
      Alert.alert('Erreur', 'Date d\'expiration invalide');
      return false;
    }
    if (cvc.length < 3) {
      Alert.alert('Erreur', 'CVC invalide');
      return false;
    }
    if (cardName.trim().length < 3) {
      Alert.alert('Erreur', 'Nom du titulaire requis');
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (paymentMethod === 'card' && !validateCard()) {
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Créer le PaymentIntent côté serveur
      const { clientSecret, paymentIntentId } = await api.createPaymentIntent(parcelId);
      
      // 2. En production, utiliser Stripe.confirmPayment() ici
      // Pour le MVP, on simule la confirmation
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 3. Confirmer le paiement côté serveur
      const result = await api.confirmPayment(paymentIntentId);
      
      if (result.success) {
        Alert.alert(
          '✅ Paiement réussi',
          'Votre paiement a été accepté. Le livreur va être notifié.',
          [
            {
              text: 'Voir le colis',
              onPress: () => navigation.replace('ParcelDetail', { parcelId }),
            },
          ]
        );
      } else {
        throw new Error('Paiement échoué');
      }
    } catch (error: any) {
      console.error('Erreur paiement:', error);
      Alert.alert(
        'Erreur de paiement',
        error.response?.data?.message || 'Le paiement a échoué. Veuillez réessayer.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!parcel) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>Colis introuvable</Text>
      </View>
    );
  }

  const price = Number(parcel.price) || PRICING.FIXED_PRICE;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Résumé du colis */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons name="package-variant" size={28} color={colors.primary} />
            <View style={styles.summaryHeaderText}>
              <Text style={styles.summaryTitle}>Livraison vers</Text>
              <Text style={styles.summarySubtitle}>{parcel.dropoffName}</Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taille du colis</Text>
            <Text style={styles.summaryValue}>{parcel.size}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frais de livraison</Text>
            <Text style={styles.summaryPrice}>{price.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Méthodes de paiement */}
        <Text style={styles.sectionTitle}>Méthode de paiement</Text>
        
        <View style={styles.methodsContainer}>
          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'card' && styles.methodCardSelected]}
            onPress={() => setPaymentMethod('card')}
          >
            <MaterialCommunityIcons 
              name="credit-card" 
              size={24} 
              color={paymentMethod === 'card' ? colors.primary : colors.onSurfaceVariant} 
            />
            <Text style={[styles.methodText, paymentMethod === 'card' && styles.methodTextSelected]}>
              Carte bancaire
            </Text>
            {paymentMethod === 'card' && (
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'apple_pay' && styles.methodCardSelected]}
            onPress={() => setPaymentMethod('apple_pay')}
            disabled={Platform.OS !== 'ios'}
          >
            <MaterialCommunityIcons 
              name="apple" 
              size={24} 
              color={Platform.OS === 'ios' ? (paymentMethod === 'apple_pay' ? colors.primary : colors.onSurfaceVariant) : colors.outline} 
            />
            <Text style={[
              styles.methodText, 
              paymentMethod === 'apple_pay' && styles.methodTextSelected,
              Platform.OS !== 'ios' && styles.methodTextDisabled
            ]}>
              Apple Pay
            </Text>
            {paymentMethod === 'apple_pay' && (
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'google_pay' && styles.methodCardSelected]}
            onPress={() => setPaymentMethod('google_pay')}
            disabled={Platform.OS !== 'android'}
          >
            <MaterialCommunityIcons 
              name="google" 
              size={24} 
              color={Platform.OS === 'android' ? (paymentMethod === 'google_pay' ? colors.primary : colors.onSurfaceVariant) : colors.outline} 
            />
            <Text style={[
              styles.methodText, 
              paymentMethod === 'google_pay' && styles.methodTextSelected,
              Platform.OS !== 'android' && styles.methodTextDisabled
            ]}>
              Google Pay
            </Text>
            {paymentMethod === 'google_pay' && (
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Formulaire carte */}
        {paymentMethod === 'card' && (
          <View style={styles.cardForm}>
            <Text style={styles.sectionTitle}>Informations de carte</Text>
            
            <TextInput
              label="Numéro de carte"
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              keyboardType="numeric"
              maxLength={19}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.outline}
              activeOutlineColor={colors.primary}
              left={<TextInput.Icon icon="credit-card" />}
              placeholder="1234 5678 9012 3456"
            />

            <View style={styles.rowInputs}>
              <TextInput
                label="MM/AA"
                value={expiry}
                onChangeText={(text) => setExpiry(formatExpiry(text))}
                keyboardType="numeric"
                maxLength={5}
                style={[styles.input, styles.halfInput]}
                mode="outlined"
                outlineColor={colors.outline}
                activeOutlineColor={colors.primary}
                placeholder="12/25"
              />
              
              <TextInput
                label="CVC"
                value={cvc}
                onChangeText={setCvc}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                style={[styles.input, styles.halfInput]}
                mode="outlined"
                outlineColor={colors.outline}
                activeOutlineColor={colors.primary}
                placeholder="123"
              />
            </View>

            <TextInput
              label="Nom du titulaire"
              value={cardName}
              onChangeText={setCardName}
              autoCapitalize="characters"
              style={styles.input}
              mode="outlined"
              outlineColor={colors.outline}
              activeOutlineColor={colors.primary}
              left={<TextInput.Icon icon="account" />}
              placeholder="JEAN DUPONT"
            />
          </View>
        )}

        {/* Apple Pay / Google Pay info */}
        {(paymentMethod === 'apple_pay' || paymentMethod === 'google_pay') && (
          <View style={styles.walletInfo}>
            <MaterialCommunityIcons 
              name={paymentMethod === 'apple_pay' ? 'apple' : 'google'} 
              size={48} 
              color={colors.primary} 
            />
            <Text style={styles.walletTitle}>
              {paymentMethod === 'apple_pay' ? 'Apple Pay' : 'Google Pay'}
            </Text>
            <Text style={styles.walletSubtitle}>
              Vous serez redirigé vers {paymentMethod === 'apple_pay' ? 'Apple Pay' : 'Google Pay'} pour finaliser le paiement de manière sécurisée.
            </Text>
          </View>
        )}

        {/* Sécurité */}
        <View style={styles.securityBanner}>
          <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" />
          <Text style={styles.securityText}>
            Paiement sécurisé par Stripe. Vos données bancaires sont cryptées.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Bouton payer */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total à payer</Text>
          <Text style={styles.totalPrice}>{price.toFixed(2)} €</Text>
        </View>
        
        <Button
          mode="contained"
          onPress={handlePayment}
          loading={isProcessing}
          disabled={isProcessing}
          style={styles.payButton}
          contentStyle={styles.payButtonContent}
          labelStyle={styles.payButtonLabel}
          icon={paymentMethod === 'card' ? 'credit-card' : paymentMethod === 'apple_pay' ? 'apple' : 'google'}
        >
          {isProcessing ? 'Traitement...' : `Payer ${price.toFixed(2)} €`}
        </Button>

        <Text style={styles.termsText}>
          En payant, vous acceptez nos conditions générales de vente.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.onSurfaceVariant,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 18,
    color: colors.error,
    textAlign: 'center',
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  summarySubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 2,
  },
  divider: {
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.onSurface,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  // Payment Methods
  methodsContainer: {
    gap: 12,
    marginBottom: spacing.lg,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.outline,
    gap: 12,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  methodText: {
    flex: 1,
    fontSize: 16,
    color: colors.onSurface,
  },
  methodTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  methodTextDisabled: {
    color: colors.outline,
  },

  // Card Form
  cardForm: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },

  // Wallet Info
  walletInfo: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  walletSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  // Security Banner
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },

  spacer: {
    height: 100,
  },

  // Footer
  footer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
  },
  payButton: {
    borderRadius: 12,
  },
  payButtonContent: {
    paddingVertical: 8,
  },
  payButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});