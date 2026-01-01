import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { api } from '../../services/api';
import { colors, spacing } from '../../theme';

type ReviewScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ params: { parcelId: string; carrierName?: string; dropoffName?: string } }, 'params'>;
};

export function ReviewScreen({ navigation, route }: ReviewScreenProps) {
  const { parcelId, carrierName, dropoffName } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createReview({
        parcelId,
        rating,
        comment: comment.trim() || undefined,
      });
      
      Alert.alert(
        'Merci !',
        'Votre avis a bien été enregistré.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.error || 'Impossible de soumettre l\'avis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStar = (index: number) => {
    const filled = index <= rating;
    return (
      <MaterialCommunityIcons
        key={index}
        name={filled ? 'star' : 'star-outline'}
        size={40}
        color={filled ? '#F59E0B' : colors.onSurfaceVariant}
        onPress={() => setRating(index)}
        style={styles.star}
      />
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Évaluer la livraison
          </Text>

          {carrierName && (
            <Text variant="bodyLarge" style={styles.subtitle}>
              Comment s'est passée la livraison avec {carrierName} ?
            </Text>
          )}

          {dropoffName && (
            <View style={styles.parcelInfo}>
              <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
              <Text variant="bodyMedium" style={styles.parcelText}>
                {dropoffName}
              </Text>
            </View>
          )}

          {/* Stars */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map(renderStar)}
          </View>

          <Text variant="bodyMedium" style={styles.ratingLabel}>
            {rating === 0 && 'Touchez les étoiles pour noter'}
            {rating === 1 && 'Très insatisfait 😞'}
            {rating === 2 && 'Insatisfait 😕'}
            {rating === 3 && 'Correct 😐'}
            {rating === 4 && 'Satisfait 😊'}
            {rating === 5 && 'Excellent ! 🤩'}
          </Text>

          {/* Comment */}
          <TextInput
            label="Commentaire (optionnel)"
            value={comment}
            onChangeText={setComment}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
            placeholder="Décrivez votre expérience..."
            maxLength={500}
          />
          <Text variant="bodySmall" style={styles.charCount}>
            {comment.length}/500
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
          disabled={isSubmitting}
        >
          Plus tard
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={isSubmitting}
          disabled={isSubmitting || rating === 0}
        >
          Envoyer
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
  },
  title: {
    textAlign: 'center',
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  parcelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
  },
  parcelText: {
    color: colors.primary,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  star: {
    marginHorizontal: spacing.xs,
  },
  ratingLabel: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    minHeight: 24,
  },
  input: {
    backgroundColor: colors.surface,
  },
  charCount: {
    textAlign: 'right',
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
  },
});