import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { hdColors } from '../../theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export function Logo({ size = 'medium', showText = true, variant = 'light' }: LogoProps) {
  const iconSize = size === 'small' ? 48 : size === 'medium' ? 64 : 84;
  const fontSize = size === 'small' ? 24 : size === 'medium' ? 32 : 40;
  const hopColor = variant === 'dark' ? '#FFFFFF' : hdColors.text;
  const dropColor = hdColors.logoOrange;

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Image
          source={require('../../../assets/icon.png')}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="contain"
        />
        {showText && (
          <Text style={{
            fontSize,
            fontWeight: '800',
            letterSpacing: -1,
            lineHeight: iconSize,
          }}>
            <Text style={{ color: hopColor }}>Hop</Text>
            <Text style={{ color: dropColor }}>Drop</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});