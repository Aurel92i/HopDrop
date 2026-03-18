import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image, Alert, BackHandler } from 'react-native';
import { Text, Button, Card, RadioButton, Snackbar, ActivityIndicator, Chip, Modal, Portal, TextInput, Checkbox } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { FormInput } from '../../components/forms/FormInput';
import { useParcelStore } from '../../stores/parcelStore';
import { api, AnalysisResult, PRICING } from '../../services/api';
import { VendorStackParamList } from '../../navigation/types';
import { Address, ParcelSize, Carrier, PickupMode } from '../../types';
import { colors, spacing, hdColors, borderRadius, sizes, carriers } from '../../theme';
import { AddressAutocomplete } from '../../components/forms/AddressAutocomplete';
import ArticleAnalysisModal from '../../components/vendor/ArticleAnalysisModal';
import { useTranslation } from '../../i18n/i18nContext';
import { PhotoPreviewModal } from '../../components/common/PhotoPreviewModal';

const createParcelSchema = z.object({
  pickupAddressId: z.string().min(1, 'Sélectionnez une adresse'),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']),
  carrier: z.enum(['VINTED', 'MONDIAL_RELAY', 'COLISSIMO', 'CHRONOPOST', 'RELAIS_COLIS', 'UPS']),
  hasShippingLabel: z.boolean(),
  shippingLabelUrl: z.string().optional(),
  qrCodeUrl: z.string().optional(),
  willPrintLabel: z.boolean(),
  pickupMode: z.enum(['SCHEDULED', 'IMMEDIATE']),
  pickupDate: z.string().optional(),
  pickupTimeStart: z.string().optional(),
  pickupTimeEnd: z.string().optional(),
  pickupInstructions: z.string().optional(),
  description: z.string().optional(),
  itemPhotoUrl: z.string().optional(),
  itemCategory: z.string().optional(),
}).refine((data) => {
  if (data.pickupMode === 'SCHEDULED') {
    return data.pickupDate && data.pickupTimeStart && data.pickupTimeEnd;
  }
  return true;
}, {
  message: 'Les créneaux horaires sont requis pour un enlèvement planifié',
  path: ['pickupDate'],
});

type CreateParcelFormData = z.infer<typeof createParcelSchema>;

type CreateParcelScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'CreateParcel'>;
};

// Category icons and suggested sizes (labels are translated inside component)
const ITEM_CATEGORY_META: Record<string, { icon: string; suggestedSize: ParcelSize }> = {
  shoes: { icon: 'shoe-sneaker', suggestedSize: 'MEDIUM' },
  clothing: { icon: 'tshirt-crew', suggestedSize: 'SMALL' },
  electronics: { icon: 'cellphone', suggestedSize: 'SMALL' },
  book: { icon: 'book-open-variant', suggestedSize: 'SMALL' },
  bag: { icon: 'bag-personal', suggestedSize: 'MEDIUM' },
  jewelry: { icon: 'diamond-stone', suggestedSize: 'SMALL' },
  toy: { icon: 'toy-brick', suggestedSize: 'MEDIUM' },
  home: { icon: 'home', suggestedSize: 'LARGE' },
  sport: { icon: 'basketball', suggestedSize: 'LARGE' },
};

// Générer les créneaux horaires disponibles
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 6; hour <= 22; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
};

export function CreateParcelScreen({ navigation }: CreateParcelScreenProps) {
  const { t } = useTranslation();
  const { createParcel, isLoading, error, clearError } = useParcelStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [step, setStep] = useState(1);
  const [itemPhoto, setItemPhoto] = useState<string | null>(null);
  const [rawItemPhotoUri, setRawItemPhotoUri] = useState<string | null>(null);
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
 
  // États pour l'analyse IA
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [articleImageUri, setArticleImageUri] = useState<string | null>(null);
  const [timeSlotPreset, setTimeSlotPreset] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const timeSlots = generateTimeSlots();

  // BUG 3: Intercept back button to navigate to previous step
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isSubmittingRef.current) return;
      if (step > 1) {
        e.preventDefault();
        setStep(step - 1);
      } else {
        e.preventDefault();
        Alert.alert(
          t('common.confirm'),
          t('vendor.createParcel.confirmExit'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.yes'), style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          ]
        );
      }
    });
    return unsubscribe;
  }, [navigation, step, t]);

  // Translated item categories (memoized)
  const ITEM_CATEGORIES = useMemo(() => {
    const categoryKeys: Record<string, string> = {
      shoes: 'vendor.createParcel.categoryShoes',
      clothing: 'vendor.createParcel.categoryClothing',
      electronics: 'vendor.createParcel.categoryElectronics',
      book: 'vendor.createParcel.categoryBook',
      bag: 'vendor.createParcel.categoryBag',
      jewelry: 'vendor.createParcel.categoryJewelry',
      toy: 'vendor.createParcel.categoryToy',
      home: 'vendor.createParcel.categoryHome',
      sport: 'vendor.createParcel.categorySport',
    };
    const result: Record<string, { label: string; icon: string; suggestedSize: ParcelSize }> = {};
    for (const [key, meta] of Object.entries(ITEM_CATEGORY_META)) {
      result[key] = { label: t(categoryKeys[key]), ...meta };
    }
    return result;
  }, [t]);

  // Translated available dates (memoized)
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    const dayNames = [
      t('vendor.createParcel.daySun'),
      t('vendor.createParcel.dayMon'),
      t('vendor.createParcel.dayTue'),
      t('vendor.createParcel.dayWed'),
      t('vendor.createParcel.dayThu'),
      t('vendor.createParcel.dayFri'),
      t('vendor.createParcel.daySat'),
    ];
    const monthNames = [
      t('vendor.createParcel.monthJan'),
      t('vendor.createParcel.monthFeb'),
      t('vendor.createParcel.monthMar'),
      t('vendor.createParcel.monthApr'),
      t('vendor.createParcel.monthMay'),
      t('vendor.createParcel.monthJun'),
      t('vendor.createParcel.monthJul'),
      t('vendor.createParcel.monthAug'),
      t('vendor.createParcel.monthSep'),
      t('vendor.createParcel.monthOct'),
      t('vendor.createParcel.monthNov'),
      t('vendor.createParcel.monthDec'),
    ];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: i === 0 ? t('vendor.createParcel.today') : i === 1 ? t('vendor.createParcel.tomorrow') : dayNames[date.getDay()],
        sublabel: `${date.getDate()} ${monthNames[date.getMonth()]}`,
      });
    }
    return dates;
  }, [t]);

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
      qrCodeUrl: '',
      willPrintLabel: false,
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
  const willPrintLabel = watch('willPrintLabel');
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

  // Callback pour l'analyse IA
  const handleAnalysisComplete = (result: AnalysisResult, imageUri: string) => {
    setAnalysisResult(result);
    setArticleImageUri(imageUri);
    setItemPhoto(imageUri);
    setValue('itemPhotoUrl', imageUri);
    setValue('itemCategory', result.articleName);
   
    const sizeMapping: Record<string, 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE'> = {
      'XS': 'SMALL',
      'S': 'SMALL',
      'M': 'MEDIUM',
      'L': 'LARGE',
    };
   
    if (result.isCompatible && result.packageSize !== 'NON_COMPATIBLE') {
      setValue('size', sizeMapping[result.packageSize] || 'MEDIUM');
      setDetectedCategory('other');
    }
  };

  // Prendre une photo de l'article (fallback sans IA)
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permissionDenied'), t('common.cameraPermission'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setRawItemPhotoUri(result.assets[0].uri);
    }
  };

  // Sélectionner une photo depuis la galerie (fallback sans IA)
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permissionDenied'), t('common.galleryPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setRawItemPhotoUri(result.assets[0].uri);
    }
  };

  // Créer une adresse temporaire
  const handleCreateTempAddress = async () => {
    if (!tempAddress.street || !tempAddress.city || !tempAddress.postalCode) {
      Alert.alert(t('common.error'), t('vendor.createParcel.fillAllFields'));
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
      Alert.alert(t('common.error'), t('vendor.createParcel.errorCreateAddress'));
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

  const handlePickQrCode = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setValue('qrCodeUrl', file.uri);
      }
    } catch (err) {
      console.error('Erreur lors de la sélection du QR code:', err);
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
        hasShippingLabel: data.willPrintLabel,
        shippingLabelUrl: data.shippingLabelUrl || undefined,
        qrCodeUrl: data.qrCodeUrl || undefined,
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

      let clientSecret: string | undefined;
      let paymentIntentId: string | undefined;
      try {
        const paymentResult = await api.createPaymentIntentForNewParcel({ parcelId: parcel.id });
        clientSecret = paymentResult.clientSecret;
        paymentIntentId = paymentResult.paymentIntentId;
      } catch (paymentError) {
        console.log('PaymentIntent creation failed, will use simulation:', paymentError);
      }

      console.log('=== PAYMENT NAV ===', { clientSecret: !!clientSecret, paymentIntentId });
      isSubmittingRef.current = true;
      navigation.replace('Payment', {
        parcelId: parcel.id,
        amount: 10,
        clientSecret,
        paymentIntentId,
      });
    } catch (e: any) {
      isSubmittingRef.current = false;
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Erreur lors de la création';
      console.error('Erreur création colis:', JSON.stringify(e.response?.data));
      Alert.alert('Erreur', msg);
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
      {watch('pickupAddressId') && (
        <Controller
          control={control}
          name="pickupInstructions"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label={t('vendor.createParcel.complementaryInfo')}
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
        📸 Votre article
      </Text>
      <Text variant="bodySmall" style={styles.stepSubtitle}>
        Prenez une photo de votre article pour que notre IA détermine automatiquement la taille de colis optimale
      </Text>
      {!analysisResult && (
        <TouchableOpacity
          style={styles.mainPhotoButton}
          onPress={() => setShowAnalysisModal(true)}
        >
          <View style={styles.mainPhotoButtonIcon}>
            <Ionicons name="camera" size={32} color="#007AFF" />
          </View>
          <View style={styles.mainPhotoButtonContent}>
            <Text style={styles.mainPhotoButtonTitle}>Prendre une photo</Text>
            <Text style={styles.mainPhotoButtonSubtitle}>L'IA analysera votre article instantanément</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
      )}
      {analysisResult && (
        <View style={styles.analysisResultContainer}>
          <View style={styles.analysisSuccessHeader}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.analysisSuccessTitle}>Article analysé</Text>
          </View>
          {articleImageUri && (
            <View style={styles.analyzedImageContainer}>
              <Image source={{ uri: articleImageUri }} style={styles.analyzedImage} />
            </View>
          )}
          <View style={styles.analysisSummaryCard}>
            <View style={styles.analysisSummaryRow}>
              <Ionicons name="cube-outline" size={20} color="#007AFF" />
              <Text style={styles.analysisSummaryLabel}>Article</Text>
              <Text style={styles.analysisSummaryValue}>{analysisResult.articleName}</Text>
            </View>
            <View style={styles.analysisSummaryDivider} />
            <View style={styles.analysisSummaryRow}>
              <Ionicons name="resize-outline" size={20} color="#007AFF" />
              <Text style={styles.analysisSummaryLabel}>Taille</Text>
              <View style={[styles.analysisSizeBadge, { backgroundColor: getSizeColor(analysisResult.packageSize) }]}>
                <Text style={styles.analysisSizeBadgeText}>{analysisResult.packageSize}</Text>
              </View>
            </View>
            <View style={styles.analysisSummaryDivider} />
            <View style={styles.analysisSummaryRow}>
              <Ionicons name="pricetag-outline" size={20} color="#2196F3" />
              <Text style={styles.analysisSummaryLabel}>Prix</Text>
              <Text style={styles.analysisPriceValue}>{PRICING?.FIXED_PRICE || 10}€</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.retakePhotoButton}
            onPress={() => {
              setAnalysisResult(null);
              setArticleImageUri(null);
              setShowAnalysisModal(true);
            }}
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#007AFF" />
            <Text style={styles.retakePhotoText}>Reprendre la photo</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.securityInfoBox}>
        <Ionicons name="shield-checkmark-outline" size={24} color="#4CAF50" />
        <View style={styles.securityInfoText}>
          <Text style={styles.securityInfoTitle}>Vos données sont protégées</Text>
          <Text style={styles.securityInfoDescription}>
            La photo reste confidentielle. Seule la catégorie générale de l'article est communiquée au livreur pour éviter tout risque.
          </Text>
        </View>
      </View>
      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep(1)} style={styles.halfButton}>
          Retour
        </Button>
        <Button
          mode="contained"
          onPress={() => setStep(3)}
          style={styles.halfButton}
          disabled={!analysisResult && !itemPhoto}
        >
          Suivant
        </Button>
      </View>
    </View>
  );

  const getSizeColor = (size: string) => {
    switch (size) {
      case 'XS': return '#4CAF50';
      case 'S': return '#8BC34A';
      case 'M': return '#FF9800';
      case 'L': return '#F44336';
      default: return colors.primary;
    }
  };

  // ========== STEP 3: Transporteur + Bordereau (MODIFIÉ) ==========
  const renderStep3 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        🚚 Transporteur
      </Text>
      <Text variant="bodySmall" style={styles.stepSubtitle}>
        Quel transporteur est indiqué sur votre bordereau ?
      </Text>

      {/* GRILLE TRANSPORTeurs – FIX VINTED (plus de débordement) */}
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

      {/* BOUTON "J'imprime moi-même" – refait en Card (plus beau et cohérent) */}
      <View style={{ marginTop: spacing.lg }}>
        <Text variant="titleMedium" style={styles.stepTitle}>
          🏷️ Bordereau d'envoi
        </Text>

        <Controller
          control={control}
          name="willPrintLabel"
          render={({ field: { onChange, value } }) => (
            <Card
              style={[styles.printOptionCard, value && styles.printOptionCardSelected]}
              onPress={() => onChange(!value)}
            >
              <Card.Content style={styles.printOptionContent}>
                <View style={styles.printOptionRow}>
                  <MaterialCommunityIcons
                    name="printer"
                    size={32}
                    color={value ? colors.primary : colors.onSurfaceVariant}
                  />
                  <View style={styles.printOptionTextContainer}>
                    <Text
                      variant="bodyMedium"
                      style={{ fontWeight: value ? '700' : '400', color: value ? colors.primary : undefined }}
                    >
                      J'imprime moi-même le bordereau
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 2 }}>
                      Je dispose déjà du bordereau et je l'imprimerai avant la remise
                    </Text>
                  </View>
                  <Checkbox
                    status={value ? 'checked' : 'unchecked'}
                    onPress={() => onChange(!value)}
                    color={colors.primary}
                  />
                </View>
              </Card.Content>
            </Card>
          )}
        />

        {/* Uploads label + QR (cachés quand on imprime soi-même) */}
        {!watch('willPrintLabel') && (
            <>
              {/* Upload Bordereau */}
              <View style={styles.uploadCard}>
                <View style={styles.uploadCardHeader}>
                  <View style={styles.uploadCardIcon}>
                    <MaterialCommunityIcons
                      name={watch('shippingLabelUrl') ? 'file-check' : 'file-document-outline'}
                      size={24}
                      color={watch('shippingLabelUrl') ? '#27AE60' : hdColors.accent}
                    />
                  </View>
                  <View style={styles.uploadCardText}>
                    <Text style={styles.uploadCardTitle}>Bordereau d'envoi</Text>
                    <Text style={styles.uploadCardDesc}>
                      {watch('shippingLabelUrl') ? 'Document ajouté' : 'PDF ou photo du bordereau'}
                    </Text>
                  </View>
                  {watch('shippingLabelUrl') && (
                    <View style={styles.uploadCardCheck}>
                      <MaterialCommunityIcons name="check-circle" size={22} color="#27AE60" />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.uploadCardButton, watch('shippingLabelUrl') && styles.uploadCardButtonDone]}
                  onPress={handlePickDocument}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={watch('shippingLabelUrl') ? 'swap-horizontal' : 'plus'}
                    size={18}
                    color={watch('shippingLabelUrl') ? hdColors.textSecondary : '#FFFFFF'}
                  />
                  <Text style={[styles.uploadCardButtonText, watch('shippingLabelUrl') && styles.uploadCardButtonTextDone]}>
                    {watch('shippingLabelUrl') ? 'Remplacer' : 'Ajouter le bordereau'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Upload QR Code */}
              <View style={styles.uploadCard}>
                <View style={styles.uploadCardHeader}>
                  <View style={[styles.uploadCardIcon, { backgroundColor: '#F3F0FF' }]}>
                    <MaterialCommunityIcons
                      name={watch('qrCodeUrl') ? 'qrcode-scan' : 'qrcode'}
                      size={24}
                      color={watch('qrCodeUrl') ? '#27AE60' : '#7C3AED'}
                    />
                  </View>
                  <View style={styles.uploadCardText}>
                    <Text style={styles.uploadCardTitle}>QR Code</Text>
                    <Text style={styles.uploadCardDesc}>
                      {watch('qrCodeUrl') ? 'QR Code ajouté' : 'Photo ou capture du QR code'}
                    </Text>
                  </View>
                  {watch('qrCodeUrl') && (
                    <View style={styles.uploadCardCheck}>
                      <MaterialCommunityIcons name="check-circle" size={22} color="#27AE60" />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.uploadCardButton, watch('qrCodeUrl') && styles.uploadCardButtonDone]}
                  onPress={handlePickQrCode}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={watch('qrCodeUrl') ? 'swap-horizontal' : 'plus'}
                    size={18}
                    color={watch('qrCodeUrl') ? hdColors.textSecondary : '#FFFFFF'}
                  />
                  <Text style={[styles.uploadCardButtonText, watch('qrCodeUrl') && styles.uploadCardButtonTextDone]}>
                    {watch('qrCodeUrl') ? 'Remplacer' : 'Ajouter le QR code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
      </View>

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep(2)} style={styles.halfButton}>
          Retour
        </Button>
        <Button mode="contained" onPress={() => setStep(4)} style={styles.halfButton}>
          Suivant
        </Button>
      </View>
    </View>
  );

  // ========== STEP 4: Créneau ==========
  const renderStep4 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        📅 Créneau de récupération
      </Text>
      <Text variant="bodySmall" style={styles.stepSubtitle}>
        Quand souhaitez-vous que le livreur vienne ?
      </Text>
      <Controller
        control={control}
        name="pickupMode"
        render={({ field: { onChange, value } }) => (
          <View style={styles.modeOptions}>
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
                    <Text variant="titleSmall" style={value === 'SCHEDULED' ? styles.modeTitleSelected : undefined}>
                      Planifié
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      Choisissez un créneau
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onChange('SCHEDULED')}>
                    <RadioButton
                      value="SCHEDULED"
                      status={value === 'SCHEDULED' ? 'checked' : 'unchecked'}
                      onPress={() => onChange('SCHEDULED')}
                    />
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
            <Card
              style={[styles.modeCard, value === 'IMMEDIATE' && styles.modeCardSelected]}
              onPress={() => onChange('IMMEDIATE')}
            >
              <Card.Content style={styles.modeContent}>
                <View style={styles.modeHeader}>
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={32}
                    color={value === 'IMMEDIATE' ? colors.primary : colors.onSurfaceVariant}
                  />
                  <View style={styles.modeInfo}>
                    <Text variant="titleSmall" style={value === 'IMMEDIATE' ? styles.modeTitleSelected : undefined}>
                      Immédiat
                    </Text>
                    <Text variant="bodySmall" style={styles.modeDescription}>
                      Dès que possible
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onChange('IMMEDIATE')}>
                    <RadioButton
                      value="IMMEDIATE"
                      status={value === 'IMMEDIATE' ? 'checked' : 'unchecked'}
                      onPress={() => onChange('IMMEDIATE')}
                    />
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          </View>
        )}
      />
      {pickupMode === 'SCHEDULED' && (
        <Card style={styles.slotCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.slotTitle}>{t('vendor.createParcel.chooseYourSlot')}</Text>
            <Text variant="bodySmall" style={styles.slotLabel}>{t('vendor.createParcel.day')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              <View style={styles.dateGrid}>
                {availableDates.map((date) => (
                  <TouchableOpacity
                    key={date.value}
                    style={[styles.dateCard, pickupDate === date.value && styles.dateCardSelected]}
                    onPress={() => setValue('pickupDate', date.value)}
                  >
                    <Text style={[styles.dateLabel, pickupDate === date.value && styles.dateLabelSelected]}>
                      {date.label}
                    </Text>
                    <Text style={styles.dateSublabel}>{date.sublabel}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text variant="bodySmall" style={[styles.slotLabel, { marginTop: spacing.md }]}>{t('vendor.createParcel.chooseSlot')}</Text>
            <View style={styles.presetGrid}>
                {[
                  { key: '08', label: '8h - 10h', start: '08:00', end: '10:00' },
                  { key: '10', label: '10h - 12h', start: '10:00', end: '12:00' },
                  { key: '12', label: '12h - 14h', start: '12:00', end: '14:00' },
                  { key: '14', label: '14h - 16h', start: '14:00', end: '16:00' },
                  { key: '16', label: '16h - 18h', start: '16:00', end: '18:00' },
                  { key: '18', label: '18h - 20h', start: '18:00', end: '20:00' },
                  { key: '20', label: '20h - 22h', start: '20:00', end: '22:00' },
                ].map((slot) => (
                  <TouchableOpacity
                    key={slot.key}
                    style={[styles.presetCard, timeSlotPreset === slot.key && styles.presetCardSelected]}
                    onPress={() => {
                      setTimeSlotPreset(slot.key);
                      setValue('pickupTimeStart', slot.start);
                      setValue('pickupTimeEnd', slot.end);
                    }}
                  >
                    <Text style={[styles.presetLabel, timeSlotPreset === slot.key && styles.presetLabelSelected]}>
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.presetCard, timeSlotPreset === 'custom' && styles.presetCardSelected]}
                  onPress={() => setTimeSlotPreset('custom')}
                >
                  <MaterialCommunityIcons name="clock-edit-outline" size={22} color={timeSlotPreset === 'custom' ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.presetLabel, timeSlotPreset === 'custom' && styles.presetLabelSelected]}>
                    {t('vendor.createParcel.slotCustom')}
                  </Text>
                </TouchableOpacity>
              </View>
            {timeSlotPreset === 'custom' && (
              <>
                <Text variant="bodySmall" style={styles.slotLabel}>{t('vendor.createParcel.startTime')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                  <View style={styles.timeGrid}>
                    {timeSlots.slice(0, -2).map((time) => (
                      <TouchableOpacity
                        key={`start-${time}`}
                        style={[styles.timeCard, pickupTimeStart === time && styles.timeCardSelected]}
                        onPress={() => {
                          setValue('pickupTimeStart', time);
                          const startHour = parseInt(time.split(':')[0]);
                          const endHour = Math.min(startHour + 2, 22);
                          setValue('pickupTimeEnd', `${endHour.toString().padStart(2, '0')}:00`);
                        }}
                      >
                        <Text style={[styles.timeLabel, pickupTimeStart === time && styles.timeLabelSelected]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <Text variant="bodySmall" style={styles.slotLabel}>{t('vendor.createParcel.endTime')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                  <View style={styles.timeGrid}>
                    {timeSlots.filter((time) => {
                      const startHour = parseInt((pickupTimeStart || '08:00').split(':')[0]);
                      const timeHour = parseInt(time.split(':')[0]);
                      return timeHour > startHour && timeHour <= startHour + 2;
                    }).map((time) => (
                      <TouchableOpacity
                        key={`end-${time}`}
                        style={[styles.timeCard, pickupTimeEnd === time && styles.timeCardSelected]}
                        onPress={() => setValue('pickupTimeEnd', time)}
                      >
                        <Text style={[styles.timeLabel, pickupTimeEnd === time && styles.timeLabelSelected]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </Card.Content>
        </Card>
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
  const renderStep5 = () => {
    const selectedAddress = addresses.find((a) => a.id === watch('pickupAddressId'));
    const carrierInfo = carriers[selectedCarrier];
    const sizeInfo = sizes.parcel[selectedSize];
    return (
      <View>
        <Text variant="titleMedium" style={styles.stepTitle}>
          ✅ Récapitulatif
        </Text>
        <Text variant="bodySmall" style={styles.stepSubtitle}>
          Vérifiez les informations avant de créer le colis
        </Text>
        <Card style={styles.summaryCard}>
          <Card.Content>
            {itemPhoto && (
              <View style={styles.summaryPhotoRow}>
                <Image source={{ uri: itemPhoto }} style={styles.summaryPhoto} />
                <View style={styles.summaryPhotoInfo}>
                  <Text variant="titleSmall">{watch('itemCategory') || 'Article'}</Text>
                  <Text variant="bodySmall">{sizeInfo?.label}</Text>
                </View>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text variant="bodySmall" style={styles.summaryLabel}>Adresse</Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {selectedAddress?.street}, {selectedAddress?.city}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodySmall" style={styles.summaryLabel}>Transporteur</Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>{carrierInfo?.label}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodySmall" style={styles.summaryLabel}>Créneau</Text>
              <View style={styles.timeSlotContainer}>
                {pickupMode === 'IMMEDIATE' ? (
                  <View style={styles.immediateSlot}>
                    <MaterialCommunityIcons name="clock-fast" size={18} color="#FF9800" />
                    <Text style={styles.immediateSlotText}>Dès que possible</Text>
                  </View>
                ) : (
                  <View style={styles.scheduledSlot}>
                    <View style={styles.scheduledSlotDate}>
                      <MaterialCommunityIcons name="calendar" size={16} color="#1976D2" />
                      <Text style={styles.scheduledSlotDateText}>
                          {pickupDate ? new Date(pickupDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                        </Text>
                    </View>
                    <View style={styles.scheduledSlotTime}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#1976D2" />
                      <Text style={styles.scheduledSlotTimeText}>
                        {pickupTimeStart} - {pickupTimeEnd}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text variant="titleSmall">Prix total</Text>
              <Text variant="titleMedium" style={styles.summaryPrice}>
                {PRICING?.FIXED_PRICE || 10}€
              </Text>
            </View>
          </Card.Content>
        </Card>
        <FormInput
          control={control}
          name="description"
          label={t('vendor.createParcel.noteForDriver')}
          placeholder="Ex: Sonner 2 fois, demander Pierre..."
          multiline
          numberOfLines={2}
        />
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
          <Text variant="bodySmall" style={styles.infoText}>
            Le livreur viendra récupérer votre colis, l'emballera avec vous, et le déposera au point relais.
          </Text>
        </View>
        <Card style={styles.paymentCard}>
          <Card.Content>
            <View style={styles.paymentHeader}>
              <MaterialCommunityIcons name="credit-card" size={24} color={colors.primary} />
              <Text variant="titleMedium" style={styles.paymentTitle}>Paiement</Text>
            </View>
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <Text style={{ fontSize: 36, fontWeight: '800', color: colors.primary }}>10,00 €</Text>
              <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
                Tarif unique — pré-autorisé maintenant, débité uniquement après livraison
              </Text>
            </View>
            <View style={styles.paymentNotice}>
              <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
              <Text style={styles.paymentNoticeText}>
                Paiement sécurisé par Stripe
              </Text>
            </View>
          </Card.Content>
        </Card>
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
            icon="lock"
            buttonColor="#10B981"
          >
            Confirmer et payer
          </Button>
        </View>
      </View>
    );
  };

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
        <View style={styles.autocompleteWrapper}>
          <AddressAutocomplete
            value={tempAddress.street}
            onAddressSelect={handleTempAddressSelect}
            label={t('vendor.createParcel.searchAddress')}
            placeholder="Tapez une adresse..."
          />
        </View>
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
      <ArticleAnalysisModal
        visible={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        onAnalysisComplete={handleAnalysisComplete}
      />
      <PhotoPreviewModal
        visible={!!rawItemPhotoUri}
        photoUri={rawItemPhotoUri}
        aspectRatio={[4, 3]}
        onValidate={(croppedUri) => {
          setRawItemPhotoUri(null);
          setItemPhoto(croppedUri);
          setValue('itemPhotoUrl', croppedUri);
          setShowAnalysisModal(true);
        }}
        onRetake={() => setRawItemPhotoUri(null)}
      />
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
    paddingBottom: 120,
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

  // Main Photo Button
  mainPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: spacing.md,
  },
  mainPhotoButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPhotoButtonContent: {
    flex: 1,
  },
  mainPhotoButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  mainPhotoButtonSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },

  // Analysis Result Container
  analysisResultContainer: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  analysisSuccessHeader: {
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.sm,
  },
  analysisSuccessTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  analyzedImageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  analyzedImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  analysisSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  analysisSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  analysisSummaryLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  analysisSummaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  analysisSummaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  analysisSizeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  analysisSizeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  analysisPriceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0D47A1',
  },
  retakePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  retakePhotoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },

  // Security Info Box
  securityInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F8E9',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  securityInfoText: {
    flex: 1,
  },
  securityInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33691E',
    marginBottom: 4,
  },
  securityInfoDescription: {
    fontSize: 13,
    color: '#558B2F',
    lineHeight: 18,
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

  // Carrier styles (FIX VINTED)
  carrierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  carrierCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 110,                    // ← FIX principal : uniformité + plus de débordement
  },
  carrierContent: {
    alignItems: 'center',
    padding: spacing.sm,
    justifyContent: 'center',          // ← centré verticalement
    flex: 1,
  },
  carrierLabel: {
    textAlign: 'center',
    marginTop: spacing.xs,
    color: colors.onSurfaceVariant,
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // NOUVEAU : Bouton "J'imprime moi-même" refait en Card
  printOptionCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.md,
  },
  printOptionCardSelected: {
    borderColor: colors.primary,
  },
  printOptionContent: {
    padding: spacing.md,
  },
  printOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  printOptionTextContainer: {
    flex: 1,
  },

  // Checkbox (ancien style conservé pour compatibilité)
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  checkboxRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
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
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.outline,
  },
  presetCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  presetLabelSelected: {
    color: colors.primary,
  },
  presetTime: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
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

  // Upload Boxes
  uploadSection: {
    marginTop: spacing.md,
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: '#FAFAFA',
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBoxFilled: {
    borderColor: '#4CAF50',
    borderStyle: 'solid',
    backgroundColor: '#E8F5E9',
  },
  uploadBoxContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadBoxText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
    textAlign: 'center',
  },
  uploadBoxTextFilled: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  uploadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: spacing.xs,
  },
  uploadBadgeText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },

  // Time Slot in Summary
  timeSlotContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  immediateSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  immediateSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  scheduledSlot: {
    gap: 6,
    alignItems: 'flex-end',
  },
  scheduledSlotDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scheduledSlotDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D47A1',
  },
  scheduledSlotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scheduledSlotTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#283593',
  },

  // Payment Card Form
  paymentCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#fff',
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paymentTitle: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  paymentForm: {
    gap: spacing.md,
  },
  cardNumberContainer: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  fakeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: '#F5F5F5',
  },
  fakeInputText: {
    fontSize: 15,
    color: '#999',
    letterSpacing: 1,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardDetailHalf: {
    flex: 1,
    gap: spacing.xs,
  },
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    padding: spacing.sm,
    borderRadius: 10,
    marginTop: spacing.xs,
  },
  paymentNoticeText: {
    fontSize: 12,
    color: '#2E7D32',
    flex: 1,
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
  sizeChip: {
    backgroundColor: colors.primaryContainer,
  },
  // Upload cards
  uploadCard: {
    backgroundColor: hdColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: hdColors.border,
    padding: 16,
    marginTop: 12,
  },
  uploadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  uploadCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCardText: {
    flex: 1,
    gap: 2,
  },
  uploadCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: hdColors.text,
  },
  uploadCardDesc: {
    fontSize: 12,
    color: hdColors.textTertiary,
  },
  uploadCardCheck: {
    marginLeft: 4,
  },
  uploadCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hdColors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  uploadCardButtonDone: {
    backgroundColor: hdColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: hdColors.border,
  },
  uploadCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  uploadCardButtonTextDone: {
    color: hdColors.textSecondary,
  },
});