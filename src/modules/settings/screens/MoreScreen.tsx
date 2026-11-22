import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, TabHeader } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Icon, IconName } from '../../../components/common/Icon';
import { Avatar } from '../../../components/common/Misc';
import { Button } from '../../../components/common/Button';
import { useFeedback } from '../../../components/common/Feedback';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authActions } from '../../../store/authSlice';
import { useNav } from '../../../navigation/hooks';
import { RootStackParamList } from '../../../navigation/types';
import { useTheme, shadow } from '../../../theme';

const ITEMS: { icon: IconName; label: string; to: keyof RootStackParamList }[] = [
  { icon: 'droplet', label: 'Products', to: 'ProductList' }, { icon: 'repeat', label: 'Subscriptions', to: 'Subscriptions' },
  { icon: 'truck', label: 'Delivery Staff', to: 'StaffList' }, { icon: 'credit-card', label: 'Payments', to: 'Payments' },
  { icon: 'trending-down', label: 'Expenses', to: 'Expenses' }, { icon: 'bar-chart-2', label: 'Reports', to: 'Reports' },
  { icon: 'bell', label: 'Notifications', to: 'Notifications' }, { icon: 'settings', label: 'Settings', to: 'Settings' },
];

export default function MoreScreen() {
  const c = useTheme();
  const nav = useNav();
  const dispatch = useAppDispatch();
  const fb = useFeedback();
  const user = useAppSelector((s) => s.auth.user);
  const unread = useAppSelector((s) => s.db.notifications.filter((n) => !n.read).length);
  return (
    <Screen scroll header={<TabHeader title="More" />} bottomInset={70}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={user?.name ?? 'User'} size={52} />
        <View style={{ flex: 1 }}><AppText v="h3">{user?.name}</AppText><AppText v="caption" color="textMuted">{user?.email}</AppText><AppText v="caption" color="secondary">{user?.business}</AppText></View>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {ITEMS.map((i, idx) => (
          <Animated.View key={i.label} entering={FadeInDown.delay(idx * 40).duration(350)} style={{ width: '48%', flexGrow: 1 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={i.label} onPress={() => nav.navigate(i.to as never)} style={[{ backgroundColor: c.surface, borderRadius: 20, padding: 16, gap: 12, minHeight: 104 }, shadow(c, 1)]}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.secondarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={i.icon} size={20} color={c.secondary} />
                {i.to === 'Notifications' && unread > 0 ? <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center' }}><AppText v="caption" color="#fff" style={{ fontSize: 10, fontWeight: '800' }}>{unread}</AppText></View> : null}
              </View>
              <AppText v="h3">{i.label}</AppText>
            </Pressable>
          </Animated.View>
        ))}
      </View>
      <Button title="Delivery mode" icon="navigation" variant="soft" onPress={() => nav.navigate('DeliveryMode')} />
      <Button title="Sign out" icon="log-out" variant="outline" onPress={() => fb.confirm('Sign out?', 'Your data stays on this device.', () => { dispatch(authActions.setUser(null)); nav.reset({ index: 0, routes: [{ name: 'Login' }] }); }, 'Sign out')} />
      <AppText v="caption" color="textMuted" align="center">Bottle Track 1.0.0</AppText>
    </Screen>
  );
}
