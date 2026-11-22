import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { AppText } from './Text';
import { IconButton } from './Button';

export const Header = ({ title, subtitle, back = true, right, onBack }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode; onBack?: () => void }) => {
  const nav = useNavigation();
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12, minHeight: 60 }}>
      {back ? <IconButton icon="arrow-left" label="Go back" onPress={onBack ?? (() => nav.goBack())} /> : <View style={{ width: 4 }} />}
      <View style={{ flex: 1 }}>
        <AppText v="h2" numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText v="caption" color="textMuted" numberOfLines={1}>{subtitle}</AppText> : null}
      </View>
      {right}
      <View />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 0, backgroundColor: c.border }} />
    </View>
  );
};

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
  keyboard?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
}

export const Screen = ({ children, scroll, header, footer, padded = true, keyboard, onRefresh, refreshing, contentStyle, bottomInset = 0 }: ScreenProps) => {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ paddingHorizontal: padded ? 20 : 0, paddingBottom: 32 + bottomInset, paddingTop: 4, gap: 16 }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.secondary} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: padded ? 20 : 0 }, contentStyle]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={keyboard !== false}>
        {body}
        {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
};

export const SectionTitle = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <AppText v="h3">{title}</AppText>
    {action ? <AppText v="label" color="secondary" onPress={onAction} accessibilityRole="button" style={{ paddingVertical: 6 }}>{action}</AppText> : null}
  </View>
);

export const Divider = () => {
  const c = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
};

export const TabHeader = ({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 12 }}>
    <View style={{ flex: 1 }}>
      <AppText v="h1">{title}</AppText>
      {subtitle ? <AppText v="caption" color="textMuted">{subtitle}</AppText> : null}
    </View>
    {right}
  </View>
);
