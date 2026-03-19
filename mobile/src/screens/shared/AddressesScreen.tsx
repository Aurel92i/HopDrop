import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, Portal, Modal, TextInput, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LoadingScreen } from '../../components/common/LoadingScreen';
import { AddressAutocomplete } from '../../components/forms/AddressAutocomplete';
import { api } from '../../services/api';
import { Address } from '../../types';
import { hdColors, spacing, borderRadius } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

export function AddressesScreen() {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
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

  // ─── Address Card ───────────────────────────────────────────────

  const renderAddress = ({ item, index }: { item: Address; index: number }) => (
    <View style={styles.hdCard}>
      {/* En-tête avec pin et label */}
      <View style={styles.cardHeader}>
        <View style={styles.pinContainer}>
          <View style={[styles.pinBg, item.isDefault && styles.pinBgDefault]}>
            <MaterialCommunityIcons
              name="map-marker"
              size={20}
              color={item.isDefault ? '#FFFFFF' : hdColors.accent}
            />
          </View>
          {/* Ligne de connexion entre les cards */}
          {index < addresses.length - 1 && <View style={styles.connectorLine} />}
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.labelRow}>
            <Text style={styles.addressLabel}>{item.label}</Text>
            {item.isDefault && (
              <View style={styles.defaultPill}>
                <Text style={styles.defaultPillText}>{t('common.defaultBadge')}</Text>
              </View>
            )}
          </View>

          <Text style={styles.streetText}>{item.street}</Text>
          <Text style={styles.cityText}>{item.postalCode} {item.city}</Text>

          {item.instructions ? (
            <View style={styles.instructionsBadge}>
              <MaterialCommunityIcons name="note-text-outline" size={14} color={hdColors.textTertiary} />
              <Text style={styles.instructionsText}>{item.instructions}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color={hdColors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="delete-outline" size={18} color={hdColors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ─── Empty State ────────────────────────────────────────────────

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <MaterialCommunityIcons name="map-marker-plus-outline" size={40} color={hdColors.accent} />
      </View>
      <Text style={styles.emptyTitle}>{t('shared.addresses.noAddresses')}</Text>
      <Text style={styles.emptySubtext}>{t('shared.addresses.noAddressesDesc')}</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => openModal()}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>{t('shared.addresses.addAddress')}</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Header Stats ───────────────────────────────────────────────

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Mini card compteur */}
      <View style={styles.counterCard}>
        <View style={styles.counterIconBg}>
          <MaterialCommunityIcons name="home-map-marker" size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.counterNumber}>{addresses.length}</Text>
          <Text style={styles.counterLabel}>
            {addresses.length <= 1 ? 'adresse enregistrée' : 'adresses enregistrées'}
          </Text>
        </View>
      </View>
    </View>
  );

  // ─── Loading ────────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingScreen message={t('shared.addresses.loadingAddresses')} />;
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderAddress}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={addresses.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB Ajouter */}
      {addresses.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => openModal()}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* ── Modal Ajout / Édition ── */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Titre modal */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconBg}>
                  <MaterialCommunityIcons
                    name={editingAddress ? 'pencil' : 'map-marker-plus'}
                    size={22}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.modalTitle}>
                  {editingAddress ? t('shared.addresses.editAddress') : t('shared.addresses.newAddress')}
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                  <MaterialCommunityIcons name="close" size={22} color={hdColors.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Label */}
              <Text style={styles.fieldLabel}>{t('shared.addresses.labelPlaceholder')}</Text>
              <TextInput
                value={form.label}
                onChangeText={(text) => setForm({ ...form, label: text })}
                mode="outlined"
                style={styles.input}
                outlineColor={hdColors.border}
                activeOutlineColor={hdColors.accent}
                outlineStyle={{ borderRadius: borderRadius.md }}
                placeholder="Ex: Maison, Bureau, Entrepôt..."
                placeholderTextColor={hdColors.chromeDark}
              />

              {/* Adresse — Autocomplete */}
              <Text style={styles.fieldLabel}>{t('shared.addresses.searchAddress')}</Text>
              <View style={styles.autocompleteContainer}>
                <AddressAutocomplete
                  value={form.street}
                  onAddressSelect={handleAddressSelect}
                  label={t('shared.addresses.searchAddress')}
                  placeholder={t('shared.addresses.searchPlaceholder')}
                />
              </View>

              {/* Adresse sélectionnée */}
              {form.street ? (
                <View style={styles.selectedCard}>
                  <View style={styles.selectedIconBg}>
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedStreet}>{form.street}</Text>
                    <Text style={styles.selectedCity}>{form.postalCode} {form.city}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setForm({ ...form, street: '', city: '', postalCode: '', latitude: 0, longitude: 0 })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color={hdColors.chromeDark} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Champs manuels si pas d'autocomplete */}
              {!form.street && (
                <>
                  <Text style={styles.fieldLabel}>{t('shared.addresses.street')}</Text>
                  <TextInput
                    value={form.street}
                    onChangeText={(text) => setForm({ ...form, street: text })}
                    mode="outlined"
                    style={styles.input}
                    outlineColor={hdColors.border}
                    activeOutlineColor={hdColors.accent}
                    outlineStyle={{ borderRadius: borderRadius.md }}
                  />

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>{t('shared.addresses.postalCode')}</Text>
                      <TextInput
                        value={form.postalCode}
                        onChangeText={(text) => setForm({ ...form, postalCode: text })}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={hdColors.border}
                        activeOutlineColor={hdColors.accent}
                        outlineStyle={{ borderRadius: borderRadius.md }}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>{t('shared.addresses.city')}</Text>
                      <TextInput
                        value={form.city}
                        onChangeText={(text) => setForm({ ...form, city: text })}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={hdColors.border}
                        activeOutlineColor={hdColors.accent}
                        outlineStyle={{ borderRadius: borderRadius.md }}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Instructions de livraison */}
              <Text style={styles.fieldLabel}>{t('shared.addresses.deliveryInstructions')}</Text>
              <TextInput
                value={form.instructions}
                onChangeText={(text) => setForm({ ...form, instructions: text })}
                mode="outlined"
                style={[styles.input, { minHeight: 80 }]}
                outlineColor={hdColors.border}
                activeOutlineColor={hdColors.accent}
                outlineStyle={{ borderRadius: borderRadius.md }}
                placeholder={t('shared.addresses.deliveryInstructionsPlaceholder')}
                placeholderTextColor={hdColors.chromeDark}
                multiline
              />

              {/* Boutons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!form.label || !form.street || !form.city || !form.postalCode) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!form.label || !form.street || !form.city || !form.postalCode || isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name={editingAddress ? 'check' : 'plus'}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: hdColors.background,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },

  // Header
  headerSection: {
    marginBottom: spacing.lg,
  },
  counterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: hdColors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  counterIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  counterLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },

  // Address Card (hdCard)
  hdCard: {
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: hdColors.border,
    padding: 16,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pinContainer: {
    alignItems: 'center',
  },
  pinBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinBgDefault: {
    backgroundColor: hdColors.accent,
  },
  connectorLine: {
    width: 2,
    height: 20,
    backgroundColor: hdColors.border,
    marginTop: 4,
  },
  cardInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: hdColors.accent,
    ...Platform.select({
      ios: { fontFamily: 'Quicksand-Bold' },
      android: { fontFamily: 'Quicksand_700Bold' },
    }),
  },
  defaultPill: {
    backgroundColor: hdColors.neonGreen,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streetText: {
    fontSize: 14,
    fontWeight: '500',
    color: hdColors.text,
  },
  cityText: {
    fontSize: 13,
    color: hdColors.textTertiary,
    marginTop: 2,
  },
  instructionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: hdColors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: hdColors.textTertiary,
    fontStyle: 'italic',
  },

  // Card Actions
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: hdColors.danger50,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: hdColors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: hdColors.accent50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: hdColors.accent,
    textAlign: 'center',
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: { fontFamily: 'Quicksand-Bold' },
      android: { fontFamily: 'Quicksand_700Bold' },
    }),
  },
  emptySubtext: {
    fontSize: 14,
    color: hdColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: hdColors.accent,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 24,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: hdColors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal
  modal: {
    backgroundColor: hdColors.surface,
    padding: 24,
    margin: spacing.lg,
    borderRadius: borderRadius.xl,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  modalIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: hdColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: hdColors.accent,
    ...Platform.select({
      ios: { fontFamily: 'Quicksand-Bold' },
      android: { fontFamily: 'Quicksand_700Bold' },
    }),
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: hdColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Form fields
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: hdColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: hdColors.surface,
    fontSize: 14,
  },
  autocompleteContainer: {
    marginBottom: spacing.md,
    zIndex: 1000,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: hdColors.success50,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: hdColors.neonGreen,
  },
  selectedIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: hdColors.neonGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedStreet: {
    fontSize: 14,
    fontWeight: '600',
    color: hdColors.text,
  },
  selectedCity: {
    fontSize: 12,
    color: hdColors.textTertiary,
    marginTop: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: hdColors.border,
    backgroundColor: hdColors.surface,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: hdColors.textSecondary,
  },
  saveButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: hdColors.accent,
    ...Platform.select({
      ios: {
        shadowColor: hdColors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  saveButtonDisabled: {
    backgroundColor: hdColors.chromeDark,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
