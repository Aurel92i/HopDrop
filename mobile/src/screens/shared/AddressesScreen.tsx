import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, FAB, Button, IconButton, Portal, Modal, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
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
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAddress(null);
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

          <TextInput
            label="Adresse"
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

          <TextInput
            label="Instructions (optionnel)"
            value={form.instructions}
            onChangeText={(text) => setForm({ ...form, instructions: text })}
            mode="outlined"
            style={styles.input}
            placeholder="Ex: Code portail 1234, 2ème étage"
          />

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={closeModal} style={styles.modalButton}>
              Annuler
            </Button>
            <Button mode="contained" onPress={handleSave} style={styles.modalButton}>
              Sauvegarder
            </Button>
          </View>
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
  },
  modalTitle: {
    marginBottom: spacing.lg,
    color: colors.onSurface,
  },
  input: {
    marginBottom: spacing.sm,
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