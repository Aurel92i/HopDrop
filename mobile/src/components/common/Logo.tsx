import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { hdColors } from '../../theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export function Logo({ size = 'medium', showText = true, variant = 'light' }: LogoProps) {
  const fontSize = size === 'small' ? 22 : size === 'medium' ? 30 : 38;
  const hopColor = variant === 'dark' ? '#FFFFFF' : hdColors.text;
  const dropColor = hdColors.logoOrange;

  return (
    <View style={styles.container}>
      <Text style={{
        fontSize,
        fontFamily: Platform.select({ ios: 'Quicksand-Bold', android: 'Quicksand_700Bold', default: 'System' }),
        fontWeight: '700',
        letterSpacing: -0.5,
      }}>
        <Text style={{ color: hopColor }}>Hop</Text>
        <Text style={{ color: dropColor }}>Drop</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
});