import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { Modal, Portal, Text, Button } from 'react-native-paper';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, spacing } from '../../theme';
import { useTranslation } from '../../i18n/i18nContext';

interface PhotoPreviewModalProps {
  visible: boolean;
  photoUri: string | null;
  aspectRatio?: [number, number];
  onValidate: (croppedUri: string) => void;
  onRetake: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CROP_WIDTH = SCREEN_WIDTH - 64;

export function PhotoPreviewModal({
  visible,
  photoUri,
  aspectRatio = [1, 1],
  onValidate,
  onRetake,
}: PhotoPreviewModalProps) {
  const { t } = useTranslation();
  const [isCropping, setIsCropping] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  const cropW = CROP_WIDTH;
  const cropH = Math.min(cropW * aspectRatio[1] / aspectRatio[0], SCREEN_HEIGHT * 0.45);

  // Mutable gesture state (refs to avoid closure staling in PanResponder)
  const s = useRef({
    naturalW: 0,
    naturalH: 0,
    fitScale: 1,
    viewW: 0,
    viewH: 0,
    scale: 1,
    tx: 0,
    ty: 0,
    panStartTx: 0,
    panStartTy: 0,
    panGsOffsetX: 0,
    panGsOffsetY: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    prevTouchCount: 0,
  }).current;

  // Animated values for rendering
  const animScale = useRef(new Animated.Value(1)).current;
  const animTx = useRef(new Animated.Value(0)).current;
  const animTy = useRef(new Animated.Value(0)).current;

  // Load image natural dimensions
  useEffect(() => {
    if (photoUri && visible) {
      setImageReady(false);
      Image.getSize(
        photoUri,
        (w, h) => {
          const fs = Math.max(cropW / w, cropH / h);
          Object.assign(s, {
            naturalW: w,
            naturalH: h,
            fitScale: fs,
            viewW: w * fs,
            viewH: h * fs,
            scale: 1,
            tx: 0,
            ty: 0,
            pinchStartDist: 0,
            prevTouchCount: 0,
          });
          animScale.setValue(1);
          animTx.setValue(0);
          animTy.setValue(0);
          setImageReady(true);
        },
        () => setImageReady(false),
      );
    }
  }, [photoUri, visible]);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const clampTr = (tx: number, ty: number, sc: number) => {
    const maxTx = Math.max(0, (s.viewW * sc - cropW) / 2);
    const maxTy = Math.max(0, (s.viewH * sc - cropH) / 2);
    return { x: clamp(tx, -maxTx, maxTx), y: clamp(ty, -maxTy, maxTy) };
  };

  const dist = (touches: any[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        s.prevTouchCount = touches.length;
        s.panStartTx = s.tx;
        s.panStartTy = s.ty;
        s.panGsOffsetX = 0;
        s.panGsOffsetY = 0;
        if (touches.length >= 2) {
          s.pinchStartDist = dist(touches);
          s.pinchStartScale = s.scale;
        }
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        const prev = s.prevTouchCount;
        s.prevTouchCount = touches.length;

        if (touches.length >= 2) {
          // Pinch zoom
          if (s.pinchStartDist === 0) {
            s.pinchStartDist = dist(touches);
            s.pinchStartScale = s.scale;
            return;
          }
          const d = dist(touches);
          const newScale = clamp(s.pinchStartScale * (d / s.pinchStartDist), 1, 5);
          s.scale = newScale;
          animScale.setValue(newScale);
          const c = clampTr(s.tx, s.ty, newScale);
          s.tx = c.x;
          s.ty = c.y;
          animTx.setValue(c.x);
          animTy.setValue(c.y);
        } else if (touches.length === 1) {
          // Transition pinch → pan
          if (prev >= 2) {
            s.panStartTx = s.tx;
            s.panStartTy = s.ty;
            s.panGsOffsetX = gs.dx;
            s.panGsOffsetY = gs.dy;
            s.pinchStartDist = 0;
          }
          const dx = gs.dx - s.panGsOffsetX;
          const dy = gs.dy - s.panGsOffsetY;
          const c = clampTr(s.panStartTx + dx, s.panStartTy + dy, s.scale);
          s.tx = c.x;
          s.ty = c.y;
          animTx.setValue(c.x);
          animTy.setValue(c.y);
        }
      },
      onPanResponderRelease: () => {
        s.pinchStartDist = 0;
        s.prevTouchCount = 0;
      },
    }),
  ).current;

  const handleValidate = async () => {
    if (!photoUri || !s.naturalW) return;

    setIsCropping(true);
    try {
      const { scale: zoom, tx, ty, fitScale: fs, viewW: vw, viewH: vh, naturalW: nw, naturalH: nh } = s;

      // Map crop frame corners back to natural image coordinates
      const pxLeft = (-cropW / 2 - tx) / zoom + vw / 2;
      const pyTop = (-cropH / 2 - ty) / zoom + vh / 2;
      const ivW = cropW / zoom;
      const ivH = cropH / zoom;

      const originX = clamp(Math.round(pxLeft / fs), 0, nw);
      const originY = clamp(Math.round(pyTop / fs), 0, nh);
      const width = clamp(Math.round(ivW / fs), 1, nw - originX);
      const height = clamp(Math.round(ivH / fs), 1, nh - originY);

      const result = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      onValidate(result.uri);
    } catch (e) {
      console.error('Crop error:', e);
      onValidate(photoUri);
    } finally {
      setIsCropping(false);
    }
  };

  if (!photoUri) return null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onRetake} contentContainerStyle={styles.container}>
        <Text variant="titleMedium" style={styles.title}>
          {t('common.photoPreviewTitle')}
        </Text>
        <Text variant="bodySmall" style={styles.hint}>
          {t('common.cropHint')}
        </Text>

        <View style={[styles.cropFrame, { width: cropW, height: cropH }]}>
          {imageReady ? (
            <Animated.View
              {...panResponder.panHandlers}
              style={{
                width: s.viewW,
                height: s.viewH,
                transform: [
                  { translateX: animTx },
                  { translateY: animTy },
                  { scale: animScale },
                ],
              }}
            >
              <Image
                source={{ uri: photoUri }}
                style={{ width: s.viewW, height: s.viewH }}
                resizeMode="cover"
              />
            </Animated.View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.buttons}>
          <Button
            mode="contained"
            icon="check"
            onPress={handleValidate}
            loading={isCropping}
            disabled={isCropping || !imageReady}
            style={styles.validateBtn}
          >
            {t('common.validate')}
          </Button>
          <Button
            mode="outlined"
            icon="camera-retake"
            onPress={onRetake}
            disabled={isCropping}
          >
            {t('common.retakePhoto')}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  hint: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  cropFrame: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttons: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  validateBtn: {
    paddingVertical: spacing.xs,
  },
});
