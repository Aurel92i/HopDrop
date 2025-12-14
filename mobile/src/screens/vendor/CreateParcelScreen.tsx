import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Card, RadioButton, Snackbar, TextInput } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FormInput } from '../../components/forms/FormInput';
import { useParcelStore } from '../../stores/parcelStore';
import { api } from '../../services/api';
import { VendorStackParamList } from '../../navigation/types';
import { Address, ParcelSize } from '../../types';
import { colors, spacing, sizes } from '../../theme';

const createParcelSchema = z.object({
  pickupAddressId: z.string().min(1, 'Sélectionnez une adresse'),
  dropoffType: z.enum(['POST_OFFICE', 'RELAY_POINT', 'OTHER']),
  dropoffName: z.string().min(1, 'Nom du point de dépôt requis'),
  dropoffAddress: z.string().min(1, 'Adresse de dépôt requise'),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']),
  description: z.string().optional(),
});

type CreateParcelFormData = z.infer<typeof createParcelSchema>;

type CreateParcelScreenProps = {
  navigation: NativeStackNavigationProp<VendorStackParamList, 'CreateParcel'>;
};

export function CreateParcelScreen({ navigation }: CreateParcelScreenProps) {
  const { createParcel, isLoading, error, clearError } = useParcelStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [step, setStep] = useState(1);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateParcelFormData>({
    resolver: zodResolver(createParcelSchema),
    defaultValues: {
      pickupAddressId: '',
      dropoffType: 'POST_OFFICE',
      dropoffName: '',
      dropoffAddress: '',
      size: 'SMALL',
      description: '',
    },
  });

  const selectedSize = watch('size');

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const { addresses } = await api.getAddresses();
      setAddresses(addresses);
      if (addresses.length === 0) {
        // TODO: Redirect to create address
      }
    } catch (e) {
      console.error('Error loading addresses:', e);
    }
  };

  const onSubmit = async (data: CreateParcelFormData) => {
    try {
      // Créer les créneaux (demain 14h-16h par défaut)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(16, 0, 0, 0);

      const parcel = await createParcel({
        ...data,
        pickupSlotStart: tomorrow.toISOString(),
        pickupSlotEnd: tomorrowEnd.toISOString(),
      });

      navigation.replace('ParcelDetail', { parcelId: parcel.id });
    } catch (e) {
      // Error handled by store
    }
  };

  const renderStep1 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        📍 Adresse de récupération
      </Text>

      <Controller
        control={control}
        name="pickupAddressId"
        render={({ field: { onChange, value } }) => (
          <View style={styles.addressList}>
            {addresses.map((address) => (
              <Card
                key={address.id}
                style={[
                  styles.addressCard,
                  value === address.id && styles.addressCardSelected,
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
                    <Text variant="titleSmall">{address.label}</Text>
                    <Text variant="bodySmall" style={styles.addressText}>
                      {address.street}, {address.postalCode} {address.city}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      />
      {errors.pickupAddressId && (
        <Text style={styles.errorText}>{errors.pickupAddressId.message}</Text>
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

  const renderStep2 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        📦 Taille du colis
      </Text>

      <Controller
        control={control}
        name="size"
        render={({ field: { onChange, value } }) => (
          <View style={styles.sizeGrid}>
            {(Object.keys(sizes.parcel) as ParcelSize[]).map((size) => {
              const sizeInfo = sizes.parcel[size];
              const isSelected = value === size;

              return (
                <Card
                  key={size}
                  style={[styles.sizeCard, isSelected && styles.sizeCardSelected]}
                  onPress={() => onChange(size)}
                >
                  <Card.Content style={styles.sizeContent}>
                    <MaterialCommunityIcons
                      name="package-variant"
                      size={32}
                      color={isSelected ? colors.primary : colors.onSurfaceVariant}
                    />
                    <Text
                      variant="titleSmall"
                      style={[styles.sizeLabel, isSelected && styles.sizeLabelSelected]}
                    >
                      {sizeInfo.label}
                    </Text>
                    <Text variant="bodySmall" style={styles.sizeDescription}>
                      {sizeInfo.description}
                    </Text>
                    <Text
                      variant="titleMedium"
                      style={[styles.sizePrice, isSelected && styles.sizePriceSelected]}
                    >
                      {sizeInfo.price}
                    </Text>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}
      />

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep(1)} style={styles.backButton}>
          Retour
        </Button>
        <Button mode="contained" onPress={() => setStep(3)} style={styles.nextButton}>
          Suivant
        </Button>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text variant="titleMedium" style={styles.stepTitle}>
        🏪 Point de dépôt
      </Text>

      <Controller
        control={control}
        name="dropoffType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.dropoffTypes}>
            {[
              { value: 'POST_OFFICE', label: 'Bureau de Poste', icon: 'post' },
              { value: 'RELAY_POINT', label: 'Point Relais', icon: 'store' },
              { value: 'OTHER', label: 'Autre', icon: 'map-marker' },
            ].map((type) => (
              <Card
                key={type.value}
                style={[
                  styles.dropoffCard,
                  value === type.value && styles.dropoffCardSelected,
                ]}
                onPress={() => onChange(type.value)}
              >
                <Card.Content style={styles.dropoffContent}>
                  <MaterialCommunityIcons
                    name={type.icon as any}
                    size={24}
                    color={value === type.value ? colors.primary : colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodyMedium"
                    style={value === type.value ? styles.dropoffLabelSelected : undefined}
                  >
                    {type.label}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      />

      <FormInput
        control={control}
        name="dropoffName"
        label="Nom du point de dépôt"
        placeholder="Ex: Bureau de Poste Louvre"
        error={errors.dropoffName?.message}
      />

      <FormInput
        control={control}
        name="dropoffAddress"
        label="Adresse de dépôt"
        placeholder="52 Rue du Louvre, 75001 Paris"
        error={errors.dropoffAddress?.message}
      />

      <FormInput
        control={control}
        name="description"
        label="Description (optionnel)"
        placeholder="Ex: Vêtements Vinted"
      />

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep(2)} style={styles.backButton}>
          Retour
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.nextButton}
        >
          Créer le colis
        </Button>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.progressDot, s <= step && styles.progressDotActive]}
            />
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
        action={{ label: 'OK', onPress: clearError }}
      >
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
    padding: spacing.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.outline,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  stepTitle: {
    marginBottom: spacing.md,
    color: colors.onSurface,
  },
  addressList: {
    gap: spacing.sm,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressCardSelected: {
    borderColor: colors.primary,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  addressText: {
    color: colors.onSurfaceVariant,
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sizeCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sizeCardSelected: {
    borderColor: colors.primary,
  },
  sizeContent: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  sizeLabel: {
    marginTop: spacing.xs,
    color: colors.onSurface,
  },
  sizeLabelSelected: {
    color: colors.primary,
  },
  sizeDescription: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    fontSize: 10,
  },
  sizePrice: {
    marginTop: spacing.xs,
    color: colors.onSurfaceVariant,
  },
  sizePriceSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  dropoffTypes: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dropoffCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dropoffCardSelected: {
    borderColor: colors.primary,
  },
  dropoffContent: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  dropoffLabelSelected: {
    color: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 1,
    marginTop: spacing.lg,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.xs,
  },
});