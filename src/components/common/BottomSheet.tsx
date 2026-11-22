import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { AppText } from './Text';
import { IconButton } from './Button';

export const BottomSheet = ({ visible, onClose, title, children, tall }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; tall?: boolean }) => {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      p.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      p.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => { if (done) runOnJS(setMounted)(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdrop = useAnimatedStyle(() => ({ opacity: p.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * height * 0.6 }], opacity: Math.min(1, p.value * 1.6) }));
  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: c.overlay }, backdrop]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View style={[{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * (tall ? 0.9 : 0.78), paddingBottom: Math.max(insets.bottom, 16) }, sheet]}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border }} /></View>
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 10, paddingVertical: 6 }}>
              <AppText v="h2">{title}</AppText>
              <IconButton icon="x" label="Close" onPress={onClose} bg="transparent" />
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}>{children}</ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
