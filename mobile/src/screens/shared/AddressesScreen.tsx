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

export function AddressesScreen() {
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
      console.error('Erreur:', e);
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

  // Callback quand une adresse est sélectionnée dans l'autocomplete
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
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
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
      Alert.alert('Erreur', e.message || 'Impossible de sauvegarder l\'adresse');
    }
  };

  const handleDelete = (address: Address) => {
    Alert.alert(
      'Supprimer l\'adresse',
      `Voulez-vous supprimer "${address.label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAddress(address.id);
              loadAddresses();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
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
                <Text style={styles.defaultText}>Par défaut</Text>
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
    return <LoadingScreen message="Chargement des adresses..." />;
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
            title="Aucune adresse"
            description="Ajoutez une adresse pour pouvoir créer des colis"
            actionLabel="Ajouter une adresse"
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
              {editingAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
            </Text>

            <TextInput
              label="Nom (ex: Maison, Bureau)"
              value={form.label}
              onChangeText={(text) => setForm({ ...form, label: text })}
              mode="outlined"
              style={styles.input}
            />

            {/* Autocomplétion d'adresse */}
            <View style={styles.autocompleteContainer}>
              <AddressAutocomplete
                value={form.street}
                onAddressSelect={handleAddressSelect}
                label="Rechercher une adresse"
                placeholder="Tapez une adresse..."
              />
            </View>

            {/* Affichage des champs remplis automatiquement */}
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
                  onPress={() => {
                    // Permettre l'édition manuelle
                  }}
                />
              </View>
            )}

            {/* Champs manuels (cachés si autocomplétion utilisée, mais éditables) */}
            {!form.street && (
              <>
                <TextInput
                  label="Rue"
                  value={form.street}
                  onChangeText={(text) => setForm({ ...form, street: text })}
                  mode="outlined"
                  style={styles.input}
                />

                <View style={styles.row}>
                  <TextInput
                    label="Code postal"
                    value={form.postalCode}
                    onChangeText={(text) => setForm({ ...form, postalCode: text })}
                    mode="outlined"
                    style={[styles.input, styles.halfInput]}
                    keyboardType="numeric"
                  />
                  <TextInput
                    label="Ville"
                    value={form.city}
                    onChangeText={(text) => setForm({ ...form, city: text })}
                    mode="outlined"
                    style={[styles.input, styles.halfInput]}
                  />
                </View>
              </>
            )}

            <TextInput
              label="Instructions de livraison (optionnel)"
              value={form.instructions}
              onChangeText={(text) => setForm({ ...form, instructions: text })}
              mode="outlined"
              style={styles.input}
              placeholder="Ex: Code portail 1234, 2ème étage"
              multiline
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={closeModal} style={styles.modalButton}>
                Annuler
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSave} 
                style={styles.modalButton}
                disabled={!form.label || !form.street || !form.city || !form.postalCode}
              >
                Sauvegarder
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