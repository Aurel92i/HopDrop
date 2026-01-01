import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

export function Logo({ size = 'medium' }: LogoProps) {
  const iconSize = size === 'small' ? 32 : size === 'medium' ? 48 : 64;
  const fontSize = size === 'small' ? 24 : size === 'medium' ? 32 : 40;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="package-variant" size={iconSize} color={colors.primary} />
      <Text style={[styles.text, { fontSize }]}>HopDrop</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});