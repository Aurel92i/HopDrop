import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { hdColors, borderRadius } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_MARGIN = 8;

interface Slide {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  tag: string;
  tagBg: string;
  tagColor: string;
  title: string;
  description: string;
}

const QS = Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' });

const slides: Slide[] = [
  {
    id: '1',
    icon: 'rocket-launch-outline',
    iconBg: hdColors.accent50,
    iconColor: hdColors.accent,
    tag: 'Nouveau',
    tagBg: hdColors.accent,
    tagColor: '#FFFFFF',
    title: 'Bienvenue sur HopDrop !',
    description: 'Envoyez vos colis vendus en ligne sans bouger de chez vous. Un livreur vient les chercher.',
  },
  {
    id: '2',
    icon: 'package-variant-closed',
    iconBg: '#FEF5E9',
    iconColor: '#E67E22',
    tag: 'Astuce',
    tagBg: '#E67E22',
    tagColor: '#FFFFFF',
    title: 'Emballez bien vos colis',
    description: 'Un bon emballage protège vos articles et rassure le livreur. Pensez au papier bulle !',
  },
  {
    id: '3',
    icon: 'map-marker-check-outline',
    iconBg: '#EAFAF1',
    iconColor: '#27AE60',
    tag: 'Bon à savoir',
    tagBg: '#27AE60',
    tagColor: '#FFFFFF',
    title: 'Choisissez le bon point relais',
    description: 'Sélectionnez un point relais proche de chez vous pour faciliter le dépôt par le livreur.',
  },
  {
    id: '4',
    icon: 'star-outline',
    iconBg: '#F3F0FF',
    iconColor: '#7C3AED',
    tag: 'Qualité',
    tagBg: '#7C3AED',
    tagColor: '#FFFFFF',
    title: 'Notez votre livreur',
    description: "Après chaque livraison, laissez un avis. Ça aide la communauté et motive les livreurs !",
  },
  {
    id: '5',
    icon: 'cash-check',
    iconBg: hdColors.accent50,
    iconColor: hdColors.accent,
    tag: 'Paiement',
    tagBg: hdColors.accent,
    tagColor: '#FFFFFF',
    title: 'Paiement sécurisé',
    description: 'Vos paiements sont gérés par Stripe. Le livreur est payé uniquement après confirmation.',
  },
];

export function InfoCarousel() {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_MARGIN * 2));
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.card}>
            {/* Header : icône + tag */}
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: slide.iconBg }]}>
                <MaterialCommunityIcons name={slide.icon as any} size={24} color={slide.iconColor} />
              </View>
              <View style={[styles.tag, { backgroundColor: slide.tagBg }]}>
                <Text style={[styles.tagText, { color: slide.tagColor }]}>{slide.tag}</Text>
              </View>
            </View>

            {/* Illustration placeholder */}
            <View style={[styles.illustration, { backgroundColor: slide.iconBg }]}>
              <MaterialCommunityIcons name={slide.icon as any} size={48} color={slide.iconColor} style={{ opacity: 0.4 }} />
            </View>

            {/* Texte */}
            <Text style={styles.cardTitle}>{slide.title}</Text>
            <Text style={styles.cardDesc}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: hdColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: hdColors.border,
    padding: 16,
    marginHorizontal: CARD_MARGIN,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Illustration
  illustration: {
    height: 80,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  // Text
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: hdColors.text,
    marginBottom: 4,
    fontFamily: Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' }),
  },
  cardDesc: {
    fontSize: 13,
    color: hdColors.textSecondary,
    lineHeight: 18,
  },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    height: 6,
    backgroundColor: hdColors.accent,
    borderRadius: 3,
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: hdColors.border,
  },
});