import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../i18n/i18nContext';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const { t } = useTranslation();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const sloganOpacity = useRef(new Animated.Value(0)).current;
  const dotScale1 = useRef(new Animated.Value(0)).current;
  const dotScale2 = useRef(new Animated.Value(0)).current;
  const dotScale3 = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;
  const containerTranslateY = useRef(new Animated.Value(0)).current;

  const circleScale = useRef(new Animated.Value(0.5)).current;
  const circleOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circleScale, {
            toValue: 1.5,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(circleOpacity, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(circleScale, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(circleOpacity, {
            toValue: 0.3,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    const animationSequence = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      Animated.stagger(150, [
        Animated.spring(dotScale1, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale2, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale3, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(sloganOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),

      Animated.delay(800),

      Animated.parallel([
        Animated.timing(containerTranslateY, {
          toValue: -50,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animationSequence.start(() => {
      onFinish();
    });
  }, []);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.stagger(100, [
          Animated.sequence([
            Animated.timing(dotScale1, { toValue: 1.3, duration: 300, useNativeDriver: true }),
            Animated.timing(dotScale1, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotScale2, { toValue: 1.3, duration: 300, useNativeDriver: true }),
            Animated.timing(dotScale2, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotScale3, { toValue: 1.3, duration: 300, useNativeDriver: true }),
            Animated.timing(dotScale3, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]),
        ]),
      ])
    );

    const timeout = setTimeout(() => {
      pulseAnimation.start();
    }, 1500);

    return () => {
      clearTimeout(timeout);
      pulseAnimation.stop();
    };
  }, []);

  const rotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: backgroundOpacity,
          transform: [{ translateY: containerTranslateY }],
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />

      <View style={styles.backgroundCircles}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <Animated.View
          style={[
            styles.pulsingCircle,
            {
              transform: [{ scale: circleScale }],
              opacity: circleOpacity,
            }
          ]}
        />
      </View>

      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: logoScale },
              { rotate: rotateInterpolate },
            ],
          },
        ]}
      >
        <View style={styles.logoBackground}>
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={64}
            color="#1e40af"
          />
        </View>
        <View style={styles.deliveryBadge}>
          <MaterialCommunityIcons
            name="bike-fast"
            size={24}
            color="white"
          />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.appName}>HopDrop</Text>
      </Animated.View>

      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            { transform: [{ scale: dotScale1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { transform: [{ scale: dotScale2 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { transform: [{ scale: dotScale3 }] },
          ]}
        />
      </View>

      <Animated.View style={[styles.sloganContainer, { opacity: sloganOpacity }]}>
        <Text style={styles.slogan}>
          {t('shared.splash.slogan')} 🚀
        </Text>
        <Text style={styles.subSlogan}>
          {t('shared.splash.subSlogan')}
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('shared.splash.footer')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e40af',
  },
  backgroundCircles: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  circle1: {
    width: width * 1.5,
    height: width * 1.5,
    top: -width * 0.5,
    left: -width * 0.5,
  },
  circle2: {
    width: width,
    height: width,
    bottom: -width * 0.3,
    right: -width * 0.3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  pulsingCircle: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(96, 165, 250, 0.3)',
    position: 'absolute',
    top: height * 0.35,
    left: width * 0.1,
  },
  logoContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  deliveryBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  sloganContainer: {
    marginTop: 48,
    alignItems: 'center',
  },
  slogan: {
    fontSize: 20,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  subSlogan: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
