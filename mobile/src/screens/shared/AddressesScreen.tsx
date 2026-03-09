import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView } from 'react-native';
import { Text, Card, FAB, Button, IconButton, Portal, Modal, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
import { AddressAutocomplete } from '../../components/forms/AddressAutocomplete';
import { api } from '../../services/api';
import { Address } from '../../types';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

export function AddressesScreen() {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form, setForm] = useState({
    label: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'France',
    instructions: '',
    latitude: 0,
    longitude: 0,
  });

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [])
  );

  const loadAddresses = async () => {
    try {
      const { addresses } = await api.getAddresses();
      setAddresses(addresses);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setForm({
        label: address.label,
        street: address.street,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
        instructions: address.instructions || '',
        latitude: address.latitude || 0,
        longitude: address.longitude || 0,
      });
    } else {
      setEditingAddress(null);
      setForm({
        label: '',
        street: '',
        city: '',
        postalCode: '',
        country: 'France',
        instructions: '',
        latitude: 0,
        longitude: 0,
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAddress(null);
  };

  const handleAddressSelect = (selectedAddress: {
    street: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  }) => {
    setForm({
      ...form,
      street: selectedAddress.street,
      city: selectedAddress.city,
      postalCode: selectedAddress.postalCode,
      latitude: selectedAddress.latitude,
      longitude: selectedAddress.longitude,
    });
  };

  const handleSave = async () => {
    if (!form.label || !form.street || !form.city || !form.postalCode) {
      Alert.alert(t('common.error'), t('common.fillRequired'));
      return;
    }

    try {
      if (editingAddress) {
        await api.updateAddress(editingAddress.id, form);
      } else {
        await api.createAddress(form);
      }
      closeModal();
      loadAddresses();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('shared.addresses.saveError'));
    }
  };

  const handleDelete = (address: Address) => {
    Alert.alert(
      t('shared.addresses.deleteTitle'),
      t('shared.addresses.deleteMessage').replace('{label}', address.label),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAddress(address.id);
              loadAddresses();
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ]
    );
  };

  const renderAddress = ({ item }: { item: Address }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.addressInfo}>
          <View style={styles.labelRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
            <Text variant="titleMedium" style={styles.label}>{item.label}</Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>{t('common.defaultBadge')}</Text>
              </View>
            )}
          </View>
          <Text variant="bodyMedium" style={styles.street}>{item.street}</Text>
          <Text variant="bodySmall" style={styles.city}>
            {item.postalCode} {item.city}
          </Text>
          {item.instructions && (
            <Text variant="bodySmall" style={styles.instructions}>
              📝 {item.instructions}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => openModal(item)}
          />
          <IconButton
            icon="delete"
            size={20}
            iconColor={colors.error}
            onPress={() => handleDelete(item)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading) {
    return <LoadingScreen message={t('shared.addresses.loadingAddresses')} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderAddress}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="map-marker-plus"
            title={t('shared.addresses.noAddresses')}
            description={t('shared.addresses.noAddressesDesc')}
            actionLabel={t('shared.addresses.addAddress')}
            onAction={() => openModal()}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => openModal()}
        color={colors.onPrimary}
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={styles.modal}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              {editingAddress ? t('shared.addresses.editAddress') : t('shared.addresses.newAddress')}
            </Text>

            <TextInput
              label={t('shared.addresses.labelPlaceholder')}
              value={form.label}
              onChangeText={(text) => setForm({ ...form, label: text })}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.autocompleteContainer}>
              <AddressAutocomplete
                value={form.street}
                onAddressSelect={handleAddressSelect}
                label={t('shared.addresses.searchAddress')}
                placeholder={t('shared.addresses.searchPlaceholder')}
              />
            </View>

            {form.street && (
              <View style={styles.selectedAddressCard}>
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                <View style={styles.selectedAddressContent}>
                  <Text variant="bodyMedium" style={styles.selectedAddressStreet}>
                    {form.street}
                  </Text>
                  <Text variant="bodySmall" style={styles.selectedAddressCity}>
                    {form.postalCode} {form.city}
                  </Text>
                </View>
                <IconButton
                  icon="pencil"
                  size={16}
                  onPress={() => {}}
                />
              </View>
            )}

            {!form.street && (
              <>
                <TextInput
                  label={t('shared.addresses.street')}
                  value={form.street}
                  onChangeText={(text) => setForm({ ...form, street: text })}
                  mode="outlined"
                  style={styles.input}
                />

                <View style={styles.row}>
                  <TextInput
                    label={t('shared.addresses.postalCode')}
                    value={form.postalCode}
                    onChangeText={(text) => setForm({ ...form, postalCode: text })}
                    mode="outlined"
                    style={[styles.input, styles.halfInput]}
                    keyboardType="numeric"
                  />
                  <TextInput
                    label={t('shared.addresses.city')}
                    value={form.city}
                    onChangeText={(text) => setForm({ ...form, city: text })}
                    mode="outlined"
                    style={[styles.input, styles.halfInput]}
                  />
                </View>
              </>
            )}

            <TextInput
              label={t('shared.addresses.deliveryInstructions')}
              value={form.instructions}
              onChangeText={(text) => setForm({ ...form, instructions: text })}
              mode="outlined"
              style={styles.input}
              placeholder={t('shared.addresses.deliveryInstructionsPlaceholder')}
              multiline
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={closeModal} style={styles.modalButton}>
                {t('common.cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.modalButton}
                disabled={!form.label || !form.street || !form.city || !form.postalCode}
              >
                {t('common.save')}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    color: colors.primary,
  },
  street: {
    color: colors.onSurface,
  },
  city: {
    color: colors.onSurfaceVariant,
  },
  instructions: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  modal: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 12,
    maxHeight: '85%',
  },
  modalTitle: {
    marginBottom: spacing.lg,
    color: colors.onSurface,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  autocompleteContainer: {
    marginBottom: spacing.md,
    zIndex: 1000,
  },
  selectedAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  selectedAddressContent: {
    flex: 1,
  },
  selectedAddressStreet: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  selectedAddressCity: {
    color: colors.onSurfaceVariant,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    minWidth: 100,
  },
});
