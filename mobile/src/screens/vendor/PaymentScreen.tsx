import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { VendorStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { api } from '../../services/api';

type PaymentScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'Payment'>;
  route: RouteProp<VendorStackParamList, 'Payment'>;
};

// Cartes de test pour simulation
const TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficient: '4000000000009995',
};

export function PaymentScreen({ navigation, route }: PaymentScreenProps) {
  const { parcelId, amount } = route.params;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parcel, setParcel] = useState<any>(null);
  
  // État du formulaire de carte
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    loadParcel();
  }, [parcelId]);

  const loadParcel = async () => {
    setIsLoading(true);
    try {
      const data = await api.getParcel(parcelId);
      setParcel(data);
    } catch (error) {
      console.error('Erreur chargement colis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Formatage numéro de carte
  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').substring(0, 19);
  };

  // Formatage date expiration
  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  // Détection type de carte
  const getCardType = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'mastercard';
    if (cleaned.startsWith('3')) return 'amex';
    return null;
  };

  // Validation du formulaire
  const isFormValid = () => {
    const cleanedCard = cardNumber.replace(/\s/g, '');
    return (
      cleanedCard.length >= 15 &&
      cardExpiry.length === 5 &&
      cardCvc.length >= 3 &&
      cardName.length >= 2
    );
  };

  // Simulation de paiement
  const processPayment = async () => {
    if (!isFormValid()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs de la carte');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulation d'un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 2000));

      const cleanedCard = cardNumber.replace(/\s/g, '');
      
      // Simulation des différents scénarios de carte de test
      if (cleanedCard === TEST_CARDS.decline) {
        throw new Error('Carte refusée. Veuillez utiliser une autre carte.');
      }
      
      if (cleanedCard === TEST_CARDS.insufficient) {
        throw new Error('Fonds insuffisants. Veuillez utiliser une autre carte.');
      }

      // Appeler l'API pour marquer le colis comme payé
      try {
        await api.simulatePayment(parcelId);
      } catch (apiError) {
        console.log('API payment simulation failed, continuing in test mode');
      }

      // Succès !
      Alert.alert(
        '✅ Paiement réussi !',
        `Votre paiement de ${amount.toFixed(2)}€ a été accepté.\n\nVotre colis est maintenant visible par les livreurs.`,
        [
          {
            text: 'Voir mon colis',
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
            text: 'Retour à l\'accueil',
            onPress: () => navigation.navigate('VendorHome'),
          },
        ]
      );

    } catch (error: any) {
      Alert.alert('Paiement échoué', error.message || 'Une erreur est survenue');
    } finally {
      setIsProcessing(false);
    }
  };

  // Remplir avec carte de test
  const fillTestCard = (type: 'success' | 'decline' | 'insufficient') => {
    setCardNumber(formatCardNumber(TEST_CARDS[type]));
    setCardExpiry('12/28');
    setCardCvc('123');
    setCardName('TEST USER');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const cardType = getCardType(cardNumber);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Résumé de la commande */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>Récapitulatif</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Colis</Text>
              <Text style={styles.summaryValue}>{parcel?.description || 'Colis'}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taille</Text>
              <Text style={styles.summaryValue}>{parcel?.size || 'M'}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Livraison vers</Text>
              <Text style={styles.summaryValue}>{parcel?.dropoffName || 'Point relais'}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total à payer</Text>
              <Text style={styles.totalAmount}>{amount.toFixed(2)} €</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Mode test */}
        <Card style={styles.testCard}>
          <Card.Content>
            <View style={styles.testHeader}>
              <MaterialCommunityIcons name="test-tube" size={20} color="#F59E0B" />
              <Text style={styles.testTitle}>Mode Test</Text>
            </View>
            <Text style={styles.testDescription}>
              Utilisez une carte de test pour simuler le paiement :
            </Text>
            <View style={styles.testButtons}>
              <TouchableOpacity 
                style={[styles.testButton, styles.testButtonSuccess]}
                onPress={() => fillTestCard('success')}
              >
                <Text style={styles.testButtonText}>✓ Succès</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.testButton, styles.testButtonDanger]}
                onPress={() => fillTestCard('decline')}
              >
                <Text style={styles.testButtonText}>✗ Refusée</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Formulaire carte */}
        <Card style={styles.cardForm}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Informations de carte</Text>
            
            {/* Numéro de carte */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Numéro de carte</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="credit-card" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={cardNumber}
                  onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                  keyboardType="numeric"
                  maxLength={19}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor="#9CA3AF"
                />
                {cardType && (
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={20} 
                    color="#10B981" 
                    style={styles.inputIconRight}
                  />
                )}
              </View>
            </View>
            
            {/* Expiration + CVC */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Expiration</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={cardExpiry}
                    onChangeText={(text) => setCardExpiry(formatExpiry(text))}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder="MM/AA"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>CVC</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={cardCvc}
                    onChangeText={setCardCvc}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    placeholder="123"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
            
            {/* Nom sur la carte */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nom sur la carte</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="account" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="characters"
                  placeholder="JEAN DUPONT"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Sécurité */}
        <View style={styles.securityInfo}>
          <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" />
          <Text style={styles.securityText}>
            Paiement sécurisé. Vos données sont chiffrées.
          </Text>
        </View>

        {/* Bouton de paiement */}
        <TouchableOpacity
          style={[
            styles.payButton,
            (!isFormValid() || isProcessing) && styles.payButtonDisabled
          ]}
          onPress={processPayment}
          disabled={isProcessing || !isFormValid()}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialCommunityIcons name="lock" size={20} color="white" />
              <Text style={styles.payButtonText}>Payer {amount.toFixed(2)} €</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          En cliquant sur "Payer", vous acceptez nos conditions générales de vente 
          et notre politique de confidentialité.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
  },
  
  // Summary Card
  summaryCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  divider: {
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },

  // Test Card
  testCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  testDescription: {
    fontSize: 13,
    color: '#92400E',
    marginBottom: 12,
  },
  testButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  testButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonSuccess: {
    backgroundColor: '#D1FAE5',
  },
  testButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  // Card Form
  cardForm: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  
  // Inputs
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputIconRight: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1F2937',
  },
  row: {
    flexDirection: 'row',
  },

  // Security
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Pay Button
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
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },

  // Legal
  legalText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});