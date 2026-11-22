import React, { useRef, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { AppText } from '../../../components/common/Text';
import { Button } from '../../../components/common/Button';
import { Logo } from '../../../components/common/Logo';
import { useAppDispatch } from '../../../store/hooks';
import { authActions } from '../../../store/authSlice';
import { useNav } from '../../../navigation/hooks';

const SLIDES: { icon: React.ComponentProps<typeof Feather>['name']; title: string; text: string; colors: [string, string] }[] = [
  { icon: 'shopping-bag', title: 'Orders & deliveries, sorted', text: 'Take orders, assign delivery staff and follow every delivery from pending to done.', colors: ['#1E9FD8', '#06C2D6'] },
  { icon: 'package', title: 'Know every bottle', text: 'Filled, empty, with customers or in the van — track stock for every jar size, down to the last bottle.', colors: ['#12427E', '#1E9FD8'] },
  { icon: 'trending-up', title: 'Payments & profit at a glance', text: 'Outstanding balances, deposits, expenses and clean reports, all calculated from one source of truth.', colors: ['#0B1F44', '#12427E'] },
];

const Dot = ({ on }: { on: boolean }) => {
  const a = useAnimatedStyle(() => ({ width: withSpring(on ? 26 : 8), opacity: withSpring(on ? 1 : 0.4) }));
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: '#fff' }, a]} />;
};

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const dispatch = useAppDispatch();
  const [i, setI] = useState(0);
  const ref = useRef<FlatList>(null);
  const finish = () => { dispatch(authActions.welcomeSeen()); nav.replace('Login'); };
  return (
    <LinearGradient colors={SLIDES[i].colors} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Logo size={32} mono /><AppText v="h3" color="#fff">Bottle Track</AppText></View>
        <AppText v="label" color="rgba(255,255,255,0.85)" onPress={finish} style={{ padding: 8 }} accessibilityRole="button">Skip</AppText>
      </View>
      <FlatList
        ref={ref} data={SLIDES} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(s) => s.title}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <View style={{ width, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            {index === i ? (
              <Animated.View key={i} entering={FadeInDown.duration(500)} style={{ alignItems: 'center', gap: 20 }}>
                <View style={{ width: 168, height: 168, borderRadius: 84, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 118, height: 118, borderRadius: 59, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={item.icon} size={52} color="#0B1F44" />
                  </View>
                </View>
                <AppText v="h1" color="#fff" align="center">{item.title}</AppText>
                <AppText v="body" color="rgba(255,255,255,0.85)" align="center" style={{ fontSize: 16, lineHeight: 24 }}>{item.text}</AppText>
              </Animated.View>
            ) : null}
          </View>
        )}
      />
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, gap: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>{SLIDES.map((_, k) => <Dot key={k} on={k === i} />)}</View>
        <Button title={i === SLIDES.length - 1 ? 'Get started' : 'Next'} variant="soft" onPress={() => (i === SLIDES.length - 1 ? finish() : ref.current?.scrollToIndex({ index: i + 1 }))} style={{ backgroundColor: '#fff', borderRadius: 14 }} />
      </View>
    </LinearGradient>
  );
}
