import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { shadow, useTheme } from '../../theme';
import { AppText } from './Text';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const Check = ({ color }: { color: string }) => {
  const p = useSharedValue(0);
  const s = useSharedValue(0.4);
  useEffect(() => {
    s.value = withSequence(withSpring(1.1, { damping: 8 }), withSpring(1));
    p.value = withDelay(180, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [p, s]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const props = useAnimatedProps(() => ({ strokeDashoffset: 40 * (1 - p.value) }));
  return (
    <Animated.View style={[{ width: 84, height: 84, borderRadius: 42, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }, pop]}>
      <Svg width={44} height={44} viewBox="0 0 24 24">
        <AnimatedPath d="M5 12.5 L10 17.5 L19 7" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={40} animatedProps={props} />
      </Svg>
    </Animated.View>
  );
};

interface FeedbackApi {
  success: (title: string, message?: string) => void;
  error: (message: string, title?: string) => void;
  confirm: (title: string, message: string, onConfirm: () => void, confirmLabel?: string, destructive?: boolean) => void;
}
const Ctx = createContext<FeedbackApi>({ success: () => undefined, error: () => undefined, confirm: () => undefined });
export const useFeedback = () => useContext(Ctx);

export const FeedbackProvider = ({ children }: { children: React.ReactNode }) => {
  const c = useTheme();
  const [msg, setMsg] = useState<{ title: string; message?: string; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const success = useCallback((title: string, message?: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setMsg({ title, message, key: Date.now() });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 1500);
  }, []);
  const error = useCallback((message: string, title = 'Something went wrong') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    Alert.alert(title, message);
  }, []);
  const confirm = useCallback((title: string, message: string, onConfirm: () => void, confirmLabel = 'Confirm', destructive = false) => {
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm }]);
  }, []);

  return (
    <Ctx.Provider value={{ success, error, confirm }}>
      {children}
      <Modal transparent visible={!!msg} animationType="none" statusBarTranslucent onRequestClose={() => setMsg(null)}>
        {msg ? (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(250)} style={{ flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
            <View style={[{ backgroundColor: c.surface, borderRadius: 28, paddingVertical: 28, paddingHorizontal: 36, alignItems: 'center', gap: 14, minWidth: 220, maxWidth: 300 }, shadow(c, 2)]}>
              <Check key={msg.key} color={c.success} />
              <AppText v="h2" align="center">{msg.title}</AppText>
              {msg.message ? <AppText v="body" color="textMuted" align="center">{msg.message}</AppText> : null}
            </View>
          </Animated.View>
        ) : null}
      </Modal>
    </Ctx.Provider>
  );
};
