// mobile/src/screens/shared/LegalScreen.tsx

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';

import { legalTexts, LegalDocType } from '../../data/legalTexts';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

type LegalRouteParams = {
  Legal: { docType: LegalDocType };
};

export function LegalScreen() {
  const route = useRoute<RouteProp<LegalRouteParams, 'Legal'>>();
  const { language } = useTranslation();
  const { docType } = route.params;
  const doc = legalTexts[docType];

  const title = doc.title[language] || doc.title.fr;
  const content = doc.content[language] || doc.content.fr;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.body}>
        {content}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    color: colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  body: {
    color: colors.onSurface,
    lineHeight: 22,
  },
});
