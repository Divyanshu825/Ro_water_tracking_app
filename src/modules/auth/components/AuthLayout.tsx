import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../../theme';
import { AppText } from '../../../components/common/Text';
import { Logo } from '../../../components/common/Logo';
import { IconButton } from '../../../components/common/Button';
import { useNav } from '../../../navigation/hooks';

export const AuthLayout = ({ title, subtitle, children, back }: { title: string; subtitle: string; children: React.ReactNode; back?: boolean }) => {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <LinearGradient colors={c.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 16, paddingBottom: 56, paddingHorizontal: 24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}>
            {back ? <View style={{ marginBottom: 8, alignSelf: 'flex-start' }}><IconButton icon="arrow-left" label="Go back" onPress={() => nav.goBack()} bg="rgba(255,255,255,0.16)" color="#fff" /></View> : null}
            <Animated.View entering={FadeInDown.duration(500)} style={{ gap: 10 }}>
              <Logo size={56} mono />
              <AppText v="h1" color="#fff">{title}</AppText>
              <AppText v="body" color="rgba(255,255,255,0.8)">{subtitle}</AppText>
            </Animated.View>
          </LinearGradient>
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ marginTop: -28, marginHorizontal: 16, padding: 20, borderRadius: 28, backgroundColor: c.surface, gap: 16, marginBottom: insets.bottom + 24, shadowColor: c.shadow, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
