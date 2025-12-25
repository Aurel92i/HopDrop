import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Button, Card, RadioButton, Snackbar, ActivityIndicator, Chip, Modal, Portal, TextInput } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { FormInput } from '../../components/forms/FormInput';
import { useParcelStore } from '../../stores/parcelStore';
import { api } from '../../services/api';
import { VendorStackParamList } from '../../navigation/types';
import { Address, ParcelSize, Carrier, PickupMode } from '../../types';
import { colors, spacing, sizes, carriers } from '../../theme';
import { AddressAutocomplete } from '../../components/forms/AddressAutocomplete';

const createParcelSchema = z.object({
  pickupAddressId: z.string().min(1, 'Sélectionnez une adresse'),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']),
  carrier: z.enum(['VINTED', 'MONDIAL_RELAY', 'COLISSIMO', 'CHRONOPOST', 'RELAIS_COLIS', 'UPS', 'OTHER']),
  hasShippingLabel: z.boolean(),
  shippingLabelUrl: z.string().optional(),
  pickupMode: z.enum(['SCHEDULED', 'IMMEDIATE']),
  pickupDate: z.string().optional(),
  pickupTimeStart: z.string().optional(),
  pickupTimeEnd: z.string().optional(),
  pickupInstructions: z.string().optional(),
  description: z.string().optional(),
  itemPhotoUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});

type CreateParcelFormData = z.infer<typeof createParcelSchema>;

type CreateParcelScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'CreateParcel'>;
};

// Catégories d'articles détectables par l'IA
const ITEM_CATEGORIES: Record<string, { label: string; icon: string; suggestedSize: ParcelSize }> = {
  shoes: { label: 'Chaussures', icon: 'shoe-sneaker', suggestedSize: 'MEDIUM' },
  clothing: { label: 'Vêtements', icon: 'tshirt-crew', suggestedSize: 'SMALL' },
  electronics: { label: 'Électronique', icon: 'cellphone', suggestedSize: 'SMALL' },
  book: { label: 'Livre', icon: 'book-open-variant', suggestedSize: 'SMALL' },
  bag: { label: 'Sac', icon: 'bag-personal', suggestedSize: 'MEDIUM' },
  jewelry: { label: 'Bijoux/Accessoires', icon: 'diamond-stone', suggestedSize: 'SMALL' },
  toy: { label: 'Jouet', icon: 'toy-brick', suggestedSize: 'MEDIUM' },
  home: { label: 'Décoration', icon: 'home', suggestedSize: 'LARGE' },
  sport: { label: 'Sport', icon: 'basketball', suggestedSize: 'LARGE' },
  other: { label: 'Autre', icon: 'package-variant', suggestedSize: 'MEDIUM' },
};

// Générer les créneaux horaires disponibles
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
};

// Générer les dates disponibles (aujourd'hui + 7 jours)
const generateAvailableDates = () => {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    dates.push({
      value: date.toISOString().split('T')[0],
      label: i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : dayNames[date.getDay()],
      sublabel: `${date.getDate()} ${monthNames[date.getMonth()]}`,
    });
  }
  return dates;
};

export function CreateParcelScreen({ navigation }: CreateParcelScreenProps) {
  const { createParcel, isLoading, error, clearError } = useParcelStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [step, setStep] = useState(1);
  const [itemPhoto, setItemPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const [showTempAddressModal, setShowTempAddressModal] = useState(false);
  const [tempAddress, setTempAddress] = useState({
    label: 'Adresse temporaire',
    street: '',
    city: '',
    postalCode: '',
    latitude: 0,
    longitude: 0,
  });
  
  const timeSlots = generateTimeSlots();
  const availableDates = generateAvailableDates();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateParcelFormData>({
    resolver: zodResolver(createParcelSchema),
    defaultValues: {
      pickupAddressId: '',
      size: 'SMALL',
      carrier: 'VINTED',
      hasShippingLabel: false,
      shippingLabelUrl: '',
      pickupMode: 'SCHEDULED',
      pickupDate: availableDates[1]?.value,
      pickupTimeStart: '14:00',
      pickupTimeEnd: '16:00',
      pickupInstructions: '',
      description: '',
      itemPhotoUrl: '',
      itemCategory: '',
    },
  });

  const selectedSize = watch('size');
  const selectedCarrier = watch('carrier');
  const hasShippingLabel = watch('hasShippingLabel');
  const pickupMode = watch('pickupMode');
  const pickupDate = watch('pickupDate');
  const pickupTimeStart = watch('pickupTimeStart');
  const pickupTimeEnd = watch('pickupTimeEnd');

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const { addresses: addr } = await api.getAddresses();
      setAddresses(addr);
    } catch (e) {
      console.error('Error loading addresses:', e);
    }
  };

  // Prendre une photo de l'article
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la caméra pour prendre une photo');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setItemPhoto(result.assets[0].uri);
      analyzePhoto(result.assets[0].uri);
    }
  };

  // Sélectionner une photo depuis la galerie
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la galerie');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setItemPhoto(result.assets[0].uri);
      analyzePhoto(result.assets[0].uri);
    }
  };

  // Analyser la photo avec l'IA (simulation pour le MVP)
  const analyzePhoto = async (photoUri: string) => {
    setIsAnalyzing(true);
    setValue('itemPhotoUrl', photoUri);

    // Simulation de l'analyse IA (à remplacer par un vrai appel API)
    setTimeout(() => {
      // Pour le MVP, on détecte aléatoirement une catégorie
      const categories = Object.keys(ITEM_CATEGORIES);
      const randomCategory = categories[Math.floor(Math.random() * (categories.length - 1))];
      
      setDetectedCategory(randomCategory);
      setValue('itemCategory', ITEM_CATEGORIES[randomCategory].label);
      setValue('size', ITEM_CATEGORIES[randomCategory].suggestedSize);
      setIsAnalyzing(false);
    }, 2000);
  };

  // Créer une adresse temporaire
  const handleCreateTempAddress = async () => {
    if (!tempAddress.street || !tempAddress.city || !tempAddress.postalCode) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      const { address } = await api.createAddress({
        ...tempAddress,
        isTemporary: true,
      });
      
      setAddresses([...addresses, address]);
      setValue('pickupAddressId', address.id);
      setShowTempAddressModal(false);
      setTempAddress({ label: 'Adresse temporaire', street: '', city: '', postalCode: '', latitude: 0, longitude: 0 });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de créer l\'adresse');
    }
  };

  const handleTempAddressSelect = (selectedAddress: {
    street: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  }) => {
    setTempAddress({
      ...tempAddress,
      street: selectedAddress.street,
      city: selectedAddress.city,
      postalCode: selectedAddress.postalCode,
      latitude: selectedAddress.latitude,
      longitude: selectedAddress.longitude,
    });
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setValue('shippingLabelUrl', file.uri);
      }
    } catch (err) {
      console.error('Erreur lors de la sélection du document:', err);
    }
  };

  const onSubmit = async (data: CreateParcelFormData) => {
    try {
      let pickupSlotStart: string;
      let pickupSlotEnd: string;

      if (data.pickupMode === 'IMMEDIATE') {
        const now = new Date();
        pickupSlotStart = now.toISOString();
        const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        pickupSlotEnd = later.toISOString();
      } else {
        const startDate = new Date(`${data.pickupDate}T${data.pickupTimeStart}:00`);
        const endDate = new Date(`${data.pickupDate}T${data.pickupTimeEnd}:00`);
        pickupSlotStart = startDate.toISOString();
        pickupSlotEnd = endDate.toISOString();
      }

      const parcel = await createParcel({
        pickupAddressId: data.pickupAddressId,
        size: data.size,
        carrier: data.carrier,
        hasShippingLabel: data.hasShippingLabel,
        shippingLabelUrl: data.shippingLabelUrl || undefined,
        pickupMode: data.pickupMode,
        dropoffType: 'RELAY_POINT',
        dropoffName: 'Point relais',
        dropoffAddress: 'À définir par le livreur',
        pickupSlotStart,
        pickupSlotEnd,
        pickupInstructions: data.pickupInstructions || undefined,
        description: data.description || data.itemCategory || undefined,
        itemPhotoUrl: data.itemPhotoUrl || undefined,
        itemCategory: data.itemCategory || undefined,
      });

      navigation.replace('ParcelDetail', { parcelId: parcel.id });
    } catch (e) {
      // Error handled by store
    }
  };

  // ========== STEP 1: Adresse ==========
  const renderStep1 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        📍 Adresse de récupération
      </Text>
      <Text variant="bodySmall" style={styles.stepSubtitle}>
        Où le livreur doit-il venir chercher votre colis ?
      </Text>

      <Controller
        control={control}
        name="pickupAddressId"
        render={({ field: { onChange, value } }) => (
          <View style={styles.addressList}>
            {addresses.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>Aucune adresse enregistrée</Text>
                </Card.Content>
              </Card>
            ) : (
              addresses.map((address) => (
                <Card
                  key={address.id}
                  style={[
                    styles.addressCard,
                    value === address.id && styles.cardSelected,
                  ]}
                  onPress={() => onChange(address.id)}
                >
                  <Card.Content style={styles.addressContent}>
                    <RadioButton
                      value={address.id}
                      status={value === address.id ? 'checked' : 'unchecked'}
                      onPress={() => onChange(address.id)}
                    />
                    <View style={styles.addressInfo}>
                      <View style={styles.addressLabelRow}>
                        <Text variant="titleSmall">{address.label}</Text>
                        {address.isTemporary && (
                          <Chip compact style={styles.tempChip} textStyle={styles.tempChipText}>
                            Temporaire
                          </Chip>
                        )}
                      </View>
                      <Text variant="bodySmall" style={styles.addressText}>
                        {address.street}, {address.postalCode} {address.city}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}

            {/* Bouton ajouter adresse temporaire */}
            <TouchableOpacity
              style={styles.addTempAddressButton}
              onPress={() => setShowTempAddressModal(true)}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.addTempAddressText}>Utiliser une autre adresse</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {errors.pickupAddressId && (
        <Text style={styles.errorText}>{errors.pickupAddressId.message}</Text>
      )}

      {/* Informations complémentaires */}
      {watch('pickupAddressId') && (
        <Controller
          control={control}
          name="pickupInstructions"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Informations complémentaires (optionnel)"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={styles.instructionsInput}
              placeholder="Ex: 2ème étage, code portail 1234, à l'arrière du bâtiment..."
              multiline
              numberOfLines={2}
            />
          )}
        />
      )}

      <Button
        mode="contained"
        onPress={() => setStep(2)}
        style={styles.nextButton}
        disabled={!watch('pickupAddressId')}
      >
        Suivant
      </Button>
    </View>
  );

  // ========== STEP 2: Photo de l'article ==========
  const renderStep2 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        📸 Photo de l'article
      </Text>
      <Text variant="bodySmall" style={styles.stepSubtitle}>
        Prenez une photo de votre article pour déterminer automatiquement la taille d'emballage
      </Text>

      {!itemPhoto ? (
        <Card style={styles.photoCard}>
          <Card.Content style={styles.photoContent}>
            <MaterialCommunityIcons name="camera-plus" size={64} color={colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={styles.photoHint}>
              Prenez ou sélectionnez une photo de votre article
            </Text>
            <View style={styles.photoButtons}>
              <Button mode="contained" icon="camera" onPress={takePhoto} style={styles.photoButton}>
                Prendre une photo
              </Button>
              <Button mode="outlined" icon="image" onPress={pickPhoto} style={styles.photoButton}>
                Galerie
              </Button>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <View>
          <Card style={styles.photoPreviewCard}>
            <Image source={{ uri: itemPhoto }} style={styles.photoPreview} />
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={() => {
                setItemPhoto(null);
                setDetectedCategory(null);
                setValue('itemPhotoUrl', '');
                setValue('itemCategory', '');
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={32} color={colors.error} />
            </TouchableOpacity>
          </Card>

          {isAnalyzing ? (
            <Card style={styles.analysisCard}>
              <Card.Content style={styles.analysisContent}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text variant="bodyMedium" style={styles.analysisText}>
                  Analyse de l'article en cours...
                </Text>
              </Card.Content>
            </Card>
          ) : detectedCategory ? (
            <Card style={styles.resultCard}>
              <Card.Content>
                <View style={styles.resultHeader}>
                  <MaterialCommunityIcons
                    name={ITEM_CATEGORIES[detectedCategory].icon as any}
                    size={40}
                    color={colors.primary}
                  />
                  <View style={styles.resultInfo}>
                    <Text variant="titleMedium">
                      {ITEM_CATEGORIES[detectedCategory].label}
                    </Text>
                    <Text variant="bodySmall" style={styles.resultSubtext}>
                      Article détecté automatiquement
                    </Text>
                  </View>
                  <Chip style={styles.sizeChip}>
                    {sizes.parcel[ITEM_CATEGORIES[detectedCategory].suggestedSize].label}
                  </Chip>
                </View>

                <View style={styles.resultBox}>
                  <MaterialCommunityIcons name="package-variant" size={20} color={colors.secondary} />
                  <Text variant="bodyMedium" style={styles.resultBoxText}>
                    Taille recommandée : {sizes.parcel[selectedSize].label} - {sizes.parcel[selectedSize].price}
                  </Text>
                </View>

                {/* Option de correction manuelle */}
                <TouchableOpacity
                  style={styles.correctButton}
                  onPress={() => Alert.alert(
                    'Modifier la catégorie',
                    'Sélectionnez la bonne catégorie',
                    Object.entries(ITEM_CATEGORIES).map(([key, value]) => ({
                      text: value.label,
                      onPress: () => {
                        setDetectedCategory(key);
                        setValue('itemCategory', value.label);
                        setValue('size', value.suggestedSize);
                      },
                    }))
                  )}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
                  <Text style={styles.correctButtonText}>Corriger la détection</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          ) : null}
        </View>
      )}

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="shield-check" size={20} color={colors.primary} />
        <Text variant="bodySmall" style={styles.infoText}>
          Votre photo reste confidentielle. Seule la catégorie générale est partagée avec le livreur.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep(1)} style={styles.halfButton}>
          Retour
        </Button>
        <Button
          mode="contained"
          onPress={() => setStep(3)}
          style={styles.halfButton}
          disabled={!itemPhoto || isAnalyzing}
        >
          Suivant
        </Button>
      </View>
    </View>
  );

  // ========== STEP 3: Transporteur + Bordereau ==========
  const renderStep3 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        🚚 Transporteur
      </Text>
      <Text variant="bodySmall" style={styles.stepSubtitle}>
        Quel transporteur est indiqué sur votre bordereau ?
      </Text>

      <Controller
        control={control}
        name="carrier"
        render={({ field: { onChange, value } }) => (
          <View style={styles.carrierGrid}>
            {(Object.keys(carriers) as Carrier[]).map((carrierKey) => {
              const carrierInfo = carriers[carrierKey];
              const isSelected = value === carrierKey;

              return (
                <Card
                  key={carrierKey}
                  style={[styles.carrierCard, isSelected && styles.cardSelected]}
                  onPress={() => onChange(carrierKey)}
                >
                  <Card.Content style={styles.carrierContent}>
                    <MaterialCommunityIcons
                      name={carrierInfo.icon as any}
                      size={28}
                      color={isSelected ? colors.primary : colors.onSurfaceVariant}
                    />
                    <Text
                      variant="bodySmall"
                      style={[styles.carrierLabel, isSelected && styles.labelSelected]}
                      numberOfLines={2}
                    >
                      {carrierInfo.label}
                    </Text>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}
      />

      {/* Question Bordereau */}
      <Card style={styles.labelCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.labelQuestion}>
            📄 Avez-vous imprimé votre bordereau d'envoi ?
          </Text>

          <Controller
            control={control}
            name="hasShippingLabel"
            render={({ field: { onChange, value } }) => (
              <View style={styles.labelOptions}>
                <TouchableOpacity
                  style={[styles.labelOption, value === true && styles.labelOptionSelected]}
                  onPress={() => onChange(true)}
                >
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={value === true ? colors.primary : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.labelOptionText, value === true && styles.labelSelected]}>
                    Oui, j'ai déjà imprimé le bordereau
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.labelOption, value === false && styles.labelOptionSelectedSecondary]}
                  onPress={() => onChange(false)}
                >
                  <MaterialCommunityIcons
                    name="printer"
                    size={24}
                    color={value === false ? colors.secondary : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.labelOptionText, value === false && styles.labelSelectedSecondary]}>
                    Non, le livreur l'imprimera pour moi
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />

          {hasShippingLabel && (
            <View style={styles.infoBoxSuccess}>
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
              <Text variant="bodySmall" style={styles.infoText}>
                Parfait ! Vous remettrez le bordereau imprimé au livreur lors de la prise en charge.
              </Text>
            </View>
          )}

          {!hasShippingLabel && (
            <View style={styles.uploadSection}>
              <Text variant="bodySmall" style={styles.uploadHint}>
                Ajoutez votre bordereau (PDF ou photo) pour que le livreur puisse l'imprimer :
              </Text>

              <Controller
                control={control}
                name="shippingLabelUrl"
                render={({ field: { value } }) => (
                  <View>
                    {value ? (
                      <View style={styles.uploadedFile}>
                        <MaterialCommunityIcons name="file-check" size={24} color={colors.primary} />
                        <Text style={styles.uploadedFileName} numberOfLines={1}>
                          Bordereau ajouté ✓
                        </Text>
                        <TouchableOpacity onPress={() => setValue('shippingLabelUrl', '')}>
                          <MaterialCommunityIcons name="close-circle" size={24} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Button
                        mode="outlined"
                        icon="upload"
                        style={styles.uploadButton}
                        onPress={handlePickDocument}
                      >
                        Ajouter le bordereau
                      </Button>
                    )}
                  </View>
                )}
              />

              <View style={styles.infoBoxWarning}>
                <MaterialCommunityIcons name="information" size={20} color={colors.secondary} />
                <Text variant="bodySmall" style={styles.infoText}>
                  Le livreur imprimera le bordereau et l'apposera sur votre colis.
                </Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep(2)} style={styles.halfButton}>
          Retour
        </Button>
        <Button
          mode="contained"
          onPress={() => setStep(4)}
          style={styles.halfButton}
          disabled={!hasShippingLabel && !watch('shippingLabelUrl')}
        >
          Suivant
        </Button>
      </View>
    </View>
  );

  // ========== STEP 4: Mode de prise en charge ==========
  const renderStep4 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        ⏰ Créneau de prise en charge
      </Text>
      <Text variant="bodySmall" style={styles.stepSubtitle}>
        Quand souhaitez-vous que le livreur vienne ?
      </Text>

      <Controller
        control={control}
        name="pickupMode"
        render={({ field: { onChange, value } }) => (
          <View style={styles.modeOptions}>
            {/* Mode Immédiat */}
            <Card
              style={[styles.modeCard, value === 'IMMEDIATE' && styles.modeCardSelected]}
              onPress={() => onChange('IMMEDIATE')}
            >
              <Card.Content style={styles.modeContent}>
                <View style={styles.modeHeader}>
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={32}
                    color={value === 'IMMEDIATE' ? colors.secondary : colors.onSurfaceVariant}
                  />
                  <View style={styles.modeInfo}>
                    <Text
                      variant="titleMedium"
                      style={value === 'IMMEDIATE' ? styles.modeTitleSelected : undefined}
                    >
                      Immédiat
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      Un livreur proche viendra dans les 2h
                    </Text>
                  </View>
                  <RadioButton
                    value="IMMEDIATE"
                    status={value === 'IMMEDIATE' ? 'checked' : 'unchecked'}
                    onPress={() => onChange('IMMEDIATE')}
                  />
                </View>
              </Card.Content>
            </Card>

            {/* Mode Programmé */}
            <Card
              style={[styles.modeCard, value === 'SCHEDULED' && styles.modeCardSelected]}
              onPress={() => onChange('SCHEDULED')}
            >
              <Card.Content style={styles.modeContent}>
                <View style={styles.modeHeader}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={32}
                    color={value === 'SCHEDULED' ? colors.primary : colors.onSurfaceVariant}
                  />
                  <View style={styles.modeInfo}>
                    <Text
                      variant="titleMedium"
                      style={value === 'SCHEDULED' ? styles.labelSelected : undefined}
                    >
                      Programmé
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      Choisissez un créneau horaire
                    </Text>
                  </View>
                  <RadioButton
                    value="SCHEDULED"
                    status={value === 'SCHEDULED' ? 'checked' : 'unchecked'}
                    onPress={() => onChange('SCHEDULED')}
                  />
                </View>
              </Card.Content>
            </Card>
          </View>
        )}
      />

      {/* Sélection du créneau si mode programmé */}
      {pickupMode === 'SCHEDULED' && (
        <Card style={styles.slotCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.slotTitle}>
              📅 Choisissez votre créneau
            </Text>

            {/* Sélection du jour */}
            <Text variant="bodySmall" style={styles.slotLabel}>Jour :</Text>
            <Controller
              control={control}
              name="pickupDate"
              render={({ field: { onChange, value } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                  <View style={styles.dateGrid}>
                    {availableDates.map((date) => (
                      <TouchableOpacity
                        key={date.value}
                        style={[styles.dateCard, value === date.value && styles.dateCardSelected]}
                        onPress={() => onChange(date.value)}
                      >
                        <Text
                          style={[styles.dateLabel, value === date.value && styles.dateLabelSelected]}
                        >
                          {date.label}
                        </Text>
                        <Text
                          style={[styles.dateSublabel, value === date.value && styles.dateLabelSelected]}
                        >
                          {date.sublabel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            />

            {/* Sélection de l'heure de début */}
            <Text variant="bodySmall" style={styles.slotLabel}>Heure de début :</Text>
            <Controller
              control={control}
              name="pickupTimeStart"
              render={({ field: { onChange, value } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                  <View style={styles.timeGrid}>
                    {timeSlots.map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[styles.timeCard, value === time && styles.timeCardSelected]}
                        onPress={() => {
                          onChange(time);
                          const hour = parseInt(time.split(':')[0]);
                          const endHour = Math.min(hour + 2, 20);
                          setValue('pickupTimeEnd', `${endHour.toString().padStart(2, '0')}:00`);
                        }}
                      >
                        <Text style={[styles.timeLabel, value === time && styles.timeLabelSelected]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            />

            {/* Sélection de l'heure de fin */}
            <Text variant="bodySmall" style={styles.slotLabel}>Heure de fin :</Text>
            <Controller
              control={control}
              name="pickupTimeEnd"
              render={({ field: { onChange, value } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                  <View style={styles.timeGrid}>
                    {timeSlots
                      .filter((time) => time > (pickupTimeStart || '08:00'))
                      .map((time) => (
                        <TouchableOpacity
                          key={time}
                          style={[styles.timeCard, value === time && styles.timeCardSelected]}
                          onPress={() => onChange(time)}
                        >
                          <Text style={[styles.timeLabel, value === time && styles.timeLabelSelected]}>
                            {time}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </ScrollView>
              )}
            />

            <View style={styles.slotSummary}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
              <Text variant="bodyMedium" style={styles.slotSummaryText}>
                {availableDates.find((d) => d.value === pickupDate)?.label} {availableDates.find((d) => d.value === pickupDate)?.sublabel} de {pickupTimeStart} à {pickupTimeEnd}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {pickupMode === 'IMMEDIATE' && (
        <View style={styles.infoBoxWarning}>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.secondary} />
          <Text variant="bodySmall" style={styles.infoText}>
            Les livreurs à proximité recevront une notification. Le premier qui accepte viendra chez vous dans les 2 heures.
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep(3)} style={styles.halfButton}>
          Retour
        </Button>
        <Button mode="contained" onPress={() => setStep(5)} style={styles.halfButton}>
          Suivant
        </Button>
      </View>
    </View>
  );

  // ========== STEP 5: Récapitulatif ==========
  const renderStep5 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        ✅ Récapitulatif
      </Text>

      <Card style={styles.summaryCard}>
        <Card.Content>
          {/* Photo et catégorie */}
          {itemPhoto && (
            <View style={styles.summaryPhotoRow}>
              <Image source={{ uri: itemPhoto }} style={styles.summaryPhoto} />
              <View style={styles.summaryPhotoInfo}>
                <Text variant="titleSmall">{watch('itemCategory') || 'Article'}</Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Taille : {sizes.parcel[selectedSize]?.label}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>Prix :</Text>
            <Text variant="titleMedium" style={styles.summaryPrice}>
              {sizes.parcel[selectedSize]?.price}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>Transporteur :</Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {carriers[selectedCarrier]?.label}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>Bordereau :</Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {hasShippingLabel ? '✅ Imprimé' : '🖨️ À imprimer'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>Prise en charge :</Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {pickupMode === 'IMMEDIATE' 
                ? '⚡ Immédiat' 
                : `📅 ${availableDates.find((d) => d.value === pickupDate)?.label} ${pickupTimeStart}-${pickupTimeEnd}`}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <FormInput
        control={control}
        name="description"
        label="Note pour le livreur (optionnel)"
        placeholder="Ex: Code interphone 1234, 3ème étage..."
        multiline
        numberOfLines={2}
      />

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
        <Text variant="bodySmall" style={styles.infoText}>
          Le livreur viendra récupérer votre colis, l'emballera avec vous, et le déposera au point relais.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep(4)} style={styles.halfButton}>
          Retour
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.halfButton}
        >
          Créer le colis
        </Button>
      </View>
    </View>
  );

  // Modal pour adresse temporaire
  const renderTempAddressModal = () => (
  <Portal>
    <Modal
      visible={showTempAddressModal}
      onDismiss={() => setShowTempAddressModal(false)}
      contentContainerStyle={styles.modalContainer}
    >
      <Text variant="titleLarge" style={styles.modalTitle}>
        📍 Adresse temporaire
      </Text>
      <Text variant="bodySmall" style={styles.modalSubtitle}>
        Cette adresse sera utilisée uniquement pour ce colis
      </Text>

      {/* Autocomplétion d'adresse */}
      <View style={styles.autocompleteWrapper}>
        <AddressAutocomplete
          value={tempAddress.street}
          onAddressSelect={handleTempAddressSelect}
          label="Rechercher une adresse"
          placeholder="Tapez une adresse..."
        />
      </View>

      {/* Affichage de l'adresse sélectionnée */}
      {tempAddress.street && tempAddress.city && (
        <View style={styles.selectedTempAddress}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
          <View style={styles.selectedTempAddressContent}>
            <Text variant="bodyMedium" style={styles.selectedTempAddressStreet}>
              {tempAddress.street}
            </Text>
            <Text variant="bodySmall" style={styles.selectedTempAddressCity}>
              {tempAddress.postalCode} {tempAddress.city}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => setTempAddress({ 
              label: 'Adresse temporaire', 
              street: '', 
              city: '', 
              postalCode: '',
              latitude: 0,
              longitude: 0,
            })}
          >
            <MaterialCommunityIcons name="close" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.modalButtons}>
        <Button 
          mode="outlined" 
          onPress={() => setShowTempAddressModal(false)} 
          style={styles.modalButton}
        >
          Annuler
        </Button>
        <Button 
          mode="contained" 
          onPress={handleCreateTempAddress} 
          style={styles.modalButton}
          disabled={!tempAddress.street || !tempAddress.city || !tempAddress.postalCode}
        >
          Ajouter
        </Button>
      </View>
    </Modal>
  </Portal>
);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View
              key={s}
              style={[
                styles.progressStep,
                s <= step && styles.progressStepActive,
                s < step && styles.progressStepCompleted,
              ]}
            >
              {s < step ? (
                <MaterialCommunityIcons name="check" size={14} color="white" />
              ) : (
                <Text style={[styles.progressText, s <= step && styles.progressTextActive]}>
                  {s}
                </Text>
              )}
            </View>
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      {renderTempAddressModal()}

      <Snackbar visible={!!error} onDismiss={clearError} duration={3000}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: colors.primary,
  },
  progressStepCompleted: {
    backgroundColor: colors.primary,
  },
  progressText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTextActive: {
    color: 'white',
  },
  stepTitle: {
    marginBottom: spacing.xs,
    color: colors.onSurface,
  },
  stepSubtitle: {
    marginBottom: spacing.lg,
    color: colors.onSurfaceVariant,
  },
  // Address styles
  addressList: {
    gap: spacing.sm,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addressText: {
    color: colors.onSurfaceVariant,
  },
  tempChip: {
    height: 20,
    backgroundColor: colors.secondaryContainer,
  },
  tempChipText: {
    fontSize: 10,
  },
  emptyCard: {
    backgroundColor: colors.surfaceVariant,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
  },
  addTempAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    gap: spacing.sm,
  },
  addTempAddressText: {
    color: colors.primary,
    fontWeight: '500',
  },
  instructionsInput: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  // Photo styles
  photoCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  photoContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  photoHint: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoButton: {
    flex: 1,
  },
  photoPreviewCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  analysisCard: {
    backgroundColor: colors.primaryContainer,
    marginBottom: spacing.md,
  },
  analysisContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  analysisText: {
    marginTop: spacing.md,
    color: colors.onSurface,
  },
  resultCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  resultInfo: {
    flex: 1,
  },
  resultSubtext: {
    color: colors.onSurfaceVariant,
  },
  sizeChip: {
    backgroundColor: colors.primaryContainer,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 8,
  },
  resultBoxText: {
    color: colors.onSurface,
  },
  correctButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  correctButtonText: {
    color: colors.primary,
    fontSize: 12,
  },
  // Carrier styles
  carrierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  carrierCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  carrierContent: {
    alignItems: 'center',
    padding: spacing.sm,
    minHeight: 80,
    justifyContent: 'center',
  },
  carrierLabel: {
    marginTop: spacing.xs,
    color: colors.onSurface,
    textAlign: 'center',
    fontSize: 11,
  },
  // Label styles
  labelCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  labelQuestion: {
    marginBottom: spacing.md,
    color: colors.onSurface,
  },
  labelOptions: {
    gap: spacing.sm,
  },
  labelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.outline,
    gap: spacing.sm,
  },
  labelOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  labelOptionSelectedSecondary: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryContainer,
  },
  labelOptionText: {
    color: colors.onSurface,
    flex: 1,
  },
  labelSelected: {
    color: colors.primary,
  },
  labelSelectedSecondary: {
    color: colors.secondary,
  },
  uploadSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
  },
  uploadHint: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  uploadButton: {
    borderStyle: 'dashed',
  },
  uploadedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  uploadedFileName: {
    flex: 1,
    color: colors.primary,
    fontWeight: '500',
  },
  // Mode styles
  modeOptions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  modeCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeCardSelected: {
    borderColor: colors.primary,
  },
  modeContent: {
    padding: spacing.xs,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitleSelected: {
    color: colors.secondary,
  },
  modeDescription: {
    color: colors.onSurfaceVariant,
  },
  // Slot styles
  slotCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  slotTitle: {
    marginBottom: spacing.md,
    color: colors.onSurface,
  },
  slotLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.onSurfaceVariant,
  },
  dateScroll: {
    marginBottom: spacing.sm,
  },
  dateGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    minWidth: 80,
  },
  dateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  dateLabel: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  dateSublabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  dateLabelSelected: {
    color: colors.primary,
  },
  timeScroll: {
    marginBottom: spacing.sm,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.outline,
    minWidth: 60,
    alignItems: 'center',
  },
  timeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  timeLabel: {
    color: colors.onSurface,
  },
  timeLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  slotSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
  },
  slotSummaryText: {
    color: colors.primary,
    flex: 1,
  },
  // Summary styles
  summaryCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  summaryPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  summaryPhotoInfo: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outline,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    color: colors.onSurface,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  summaryPrice: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  // Info boxes
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  infoBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  infoBoxWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  infoText: {
    flex: 1,
    color: colors.onSurface,
  },
  // Modal styles
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  modalInput: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  autocompleteWrapper: {
    marginBottom: spacing.md,
    zIndex: 1000,
  },
  selectedTempAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  selectedTempAddressContent: {
    flex: 1,
  },
  selectedTempAddressStreet: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  selectedTempAddressCity: {
    color: colors.onSurfaceVariant,
  },

  // Common
  cardSelected: {
    borderColor: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  halfButton: {
    flex: 1,
  },
  nextButton: {
    marginTop: spacing.lg,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.xs,
     },
});