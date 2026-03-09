// mobile/src/components/vendor/ArticleAnalysisModal.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api, AnalysisResult, PRICING, PACKAGE_SIZES } from '../../services/api';
import { useTranslation } from '../../i18n/i18nContext';
import { PhotoPreviewModal } from '../common/PhotoPreviewModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAnalysisComplete: (result: AnalysisResult, imageUri: string) => void;
}

export default function ArticleAnalysisModal({ visible, onClose, onAnalysisComplete }: Props) {
  const { t } = useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rawPhotoUri, setRawPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.cameraRequired'), t('common.cameraPermission'));
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      setRawPhotoUri(pickerResult.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.cameraRequired'), t('common.galleryPermission'));
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      setRawPhotoUri(pickerResult.assets[0].uri);
    }
  };

  const analyzeImage = async () => {
    if (!imageUri) return;

    setAnalyzing(true);
    try {
      const analysisResult = await api.analyzeArticleImage(imageUri);
      setResult(analysisResult);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('common.genericError'));
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmResult = () => {
    if (result && imageUri) {
      onAnalysisComplete(result, imageUri);
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setImageUri(null);
    setRawPhotoUri(null);
    setResult(null);
    onClose();
  };

  const getSizeColor = (size: string) => {
    switch (size) {
      case 'XS': return '#4CAF50';
      case 'S': return '#8BC34A';
      case 'M': return '#FF9800';
      case 'L': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getSizeInfo = (size: string) => {
    return PACKAGE_SIZES[size as keyof typeof PACKAGE_SIZES] || { name: size, description: '' };
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return { label: t('vendor.analysis.highConfidence'), color: '#4CAF50' };
      case 'MEDIUM': return { label: t('vendor.analysis.mediumConfidence'), color: '#FF9800' };
      case 'LOW': return { label: t('vendor.analysis.lowConfidence'), color: '#F44336' };
      default: return { label: '', color: '#9E9E9E' };
    }
  };

  const getCategoryIcon = (iconName: string) => {
    // Mapper les noms d'icônes IA vers MaterialCommunityIcons
    const iconMap: Record<string, string> = {
      'mouse': 'mouse',
      'laptop': 'laptop',
      'tshirt-crew': 'tshirt-crew',
      'shoe-sneaker': 'shoe-sneaker',
      'bag-personal': 'bag-personal',
      'home': 'home',
      'gamepad-variant': 'gamepad-variant',
      'spa': 'spa',
      'package-variant': 'package-variant',
    };
    return iconMap[iconName] || 'package-variant';
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('vendor.analysis.takePhoto')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!imageUri ? (
            // Sélection d'image
            <View style={styles.imageSelection}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="camera-outline" size={80} color="#007AFF" />
              </View>

              <Text style={styles.mainTitle}>{t('vendor.analysis.title')}</Text>
              <Text style={styles.instructions}>
                {t('vendor.analysis.subtitle')}
              </Text>

              <View style={styles.buttonColumn}>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={28} color="#fff" />
                  <Text style={styles.imageButtonText}>{t('vendor.analysis.takePhoto')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
                  <Ionicons name="images" size={28} color="#007AFF" />
                  <Text style={styles.galleryButtonText}>{t('vendor.analysis.pickImage')}</Text>
                </TouchableOpacity>
              </View>

              {/* Informations pratiques */}
              <View style={styles.infoSection}>
                <View style={styles.infoItem}>
                  <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoTitle}>{t('vendor.analysis.confidentiality')}</Text>
                    <Text style={styles.infoDescription}>Votre photo reste privée, seule la catégorie générale est partagée</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="flash" size={24} color="#FF9800" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoTitle}>{t('vendor.analysis.instantAnalysis')}</Text>
                    <Text style={styles.infoDescription}>Notre IA identifie votre article en quelques secondes</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="pricetag" size={24} color="#2196F3" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoTitle}>{t('vendor.analysis.uniquePrice')} {PRICING.FIXED_PRICE}€</Text>
                    <Text style={styles.infoDescription}>Peu importe la taille de votre colis</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            // Image sélectionnée
            <View style={styles.analysisContainer}>
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={() => { setImageUri(null); setResult(null); }}
                >
                  <Ionicons name="camera-reverse" size={20} color="#fff" />
                  <Text style={styles.changePhotoText}>{t('vendor.analysis.change')}</Text>
                </TouchableOpacity>
              </View>

              {!result && !analyzing && (
                <TouchableOpacity style={styles.analyzeButton} onPress={analyzeImage}>
                  <MaterialCommunityIcons name="sparkles" size={24} color="#fff" />
                  <Text style={styles.analyzeButtonText}>{t('vendor.analysis.analyzeButton')}</Text>
                </TouchableOpacity>
              )}

              {analyzing && (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingSpinner}>
                    <ActivityIndicator size="large" color="#007AFF" />
                  </View>
                  <Text style={styles.loadingText}>{t('vendor.analysis.analyzing')}</Text>
                  <Text style={styles.loadingSubtext}>{t('vendor.analysis.analyzingSubtitle')}</Text>
                </View>
              )}

              {result && (
                <View style={styles.resultContainer}>
                  {/* En-tête du résultat */}
                  <View style={styles.resultHeader}>
                    <Ionicons
                      name={result.isCompatible ? "checkmark-circle" : "alert-circle"}
                      size={48}
                      color={result.isCompatible ? "#4CAF50" : "#F44336"}
                    />
                    <Text style={styles.resultHeaderTitle}>
                      {result.isCompatible ? t('vendor.analysis.successTitle') : t('vendor.analysis.incompatibleTitle')}
                    </Text>
                    <Text style={styles.resultHeaderSubtitle}>
                      {result.isCompatible
                        ? t('vendor.analysis.successSubtitle')
                        : t('vendor.analysis.incompatibleSubtitle')}
                    </Text>
                  </View>

                  {/* Carte article */}
                  <View style={styles.articleCard}>
                    <View style={styles.articleCardHeader}>
                      <MaterialCommunityIcons
                        name={getCategoryIcon(result.articleCategory?.icon || 'package-variant') as any}
                        size={40}
                        color="#007AFF"
                      />
                      <View style={styles.articleCardInfo}>
                        <Text style={styles.articleCardCategory}>{result.articleCategory?.main}</Text>
                        <Text style={styles.articleCardName}>{result.articleName}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Taille de colis recommandée */}
                  {result.isCompatible && (
                    <View style={styles.sizeCard}>
                      <View style={styles.sizeCardHeader}>
                        <Ionicons name="cube-outline" size={24} color="#007AFF" />
                        <Text style={styles.sizeCardTitle}>{t('vendor.analysis.recommendedSize')}</Text>
                      </View>
                      <View style={styles.sizeCardBody}>
                        <View style={[styles.sizeBadgeLarge, { backgroundColor: getSizeColor(result.packageSize) }]}>
                          <Text style={styles.sizeBadgeText}>{result.packageSize}</Text>
                        </View>
                        <View style={styles.sizeCardDetails}>
                          <Text style={styles.sizeCardName}>{getSizeInfo(result.packageSize).name}</Text>
                          <Text style={styles.sizeCardDimensions}>
                            {result.packageDimensions.height} × {result.packageDimensions.width} × {result.packageDimensions.depth} cm
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {!result.isCompatible && (
                    <View style={styles.incompatibleCard}>
                      <Ionicons name="warning-outline" size={48} color="#F44336" />
                      <Text style={styles.incompatibleTitle}>{t('vendor.analysis.tooLarge')}</Text>
                      <Text style={styles.incompatibleText}>
                        {t('vendor.analysis.tooLargeDesc')}
                      </Text>
                    </View>
                  )}

                  {/* Prix */}
                  <View style={styles.priceCard}>
                    <Ionicons name="pricetag-outline" size={24} color="#2196F3" />
                    <View style={styles.priceCardContent}>
                      <Text style={styles.priceCardLabel}>{t('vendor.analysis.deliveryPrice')}</Text>
                      <Text style={styles.priceCardValue}>{PRICING.FIXED_PRICE}€</Text>
                    </View>
                  </View>

                  {/* Détails de l'analyse */}
                  <View style={styles.analysisDetails}>
                    <Text style={styles.analysisDetailsTitle}>{t('vendor.analysis.analysisDetails')}</Text>
                    <Text style={styles.analysisDetailsText}>{result.justification}</Text>
                    <View style={styles.confidenceBadge}>
                      <View style={[styles.confidenceDot, { backgroundColor: getConfidenceLabel(result.confidence).color }]} />
                      <Text style={styles.confidenceLabel}>{getConfidenceLabel(result.confidence).label}</Text>
                    </View>
                  </View>

                  {/* Boutons */}
                  <View style={styles.actionButtons}>
                    {result.isCompatible && (
                      <TouchableOpacity style={styles.confirmButton} onPress={confirmResult}>
                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                        <Text style={styles.confirmButtonText}>{t('vendor.analysis.useResult')}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => { setImageUri(null); setResult(null); }}
                    >
                      <Ionicons name="camera-reverse-outline" size={20} color="#007AFF" />
                      <Text style={styles.retryButtonText}>{t('vendor.analysis.retake')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      <PhotoPreviewModal
        visible={!!rawPhotoUri}
        photoUri={rawPhotoUri}
        aspectRatio={[4, 3]}
        onValidate={(croppedUri) => {
          setRawPhotoUri(null);
          setImageUri(croppedUri);
          setResult(null);
        }}
        onRetake={() => setRawPhotoUri(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // Image Selection
  imageSelection: {
    alignItems: 'center',
    paddingTop: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  buttonColumn: {
    width: '100%',
    gap: 14,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#007AFF',
    gap: 12,
  },
  galleryButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '700',
  },

  // Info Section
  infoSection: {
    width: '100%',
    marginTop: 32,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  // Analysis Container
  analysisContainer: {
    flex: 1,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
  },
  changePhotoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 15,
    color: '#666',
  },

  // Result Container
  resultContainer: {
    marginTop: 20,
    gap: 16,
  },
  resultHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    gap: 12,
  },
  resultHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  resultHeaderSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },

  // Article Card
  articleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  articleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  articleCardInfo: {
    flex: 1,
  },
  articleCardCategory: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  articleCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // Size Card
  sizeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  sizeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sizeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sizeCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sizeBadgeLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeBadgeText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  sizeCardDetails: {
    flex: 1,
  },
  sizeCardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sizeCardDimensions: {
    fontSize: 14,
    color: '#666',
  },

  // Incompatible Card
  incompatibleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#FFEBEE',
  },
  incompatibleTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F44336',
    textAlign: 'center',
  },
  incompatibleText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Price Card
  priceCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  priceCardContent: {
    flex: 1,
  },
  priceCardLabel: {
    fontSize: 14,
    color: '#1565C0',
    marginBottom: 4,
  },
  priceCardValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0D47A1',
  },

  // Analysis Details
  analysisDetails: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  analysisDetailsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  analysisDetailsText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  confidenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },

  // Action Buttons
  actionButtons: {
    gap: 14,
    marginTop: 8,
    marginBottom: 30,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    gap: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    gap: 8,
  },
  retryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
