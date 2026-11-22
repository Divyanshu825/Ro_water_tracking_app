import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { shadow, useTheme } from '../../theme';
import { AppText } from '../common/Text';

const ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = { Home: 'home', Customers: 'users', Orders: 'shopping-bag', Inventory: 'package', More: 'grid' };

const Tab = ({ name, label, focused, onPress, onLongPress }: { name: string; label: string; focused: boolean; onPress: () => void; onLongPress: () => void }) => {
  const c = useTheme();
  const s = useSharedValue(focused ? 1 : 0);
  useEffect(() => { s.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 180 }); }, [focused, s]);
  const pill = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ scale: 0.7 + s.value * 0.3 }] }));
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -s.value * 2 }, { scale: 1 + s.value * 0.08 }] }));
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }} onPress={onPress} onLongPress={onLongPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 56 }}>
      <Animated.View style={[{ position: 'absolute', width: 52, height: 34, top: 6, borderRadius: 17, backgroundColor: c.secondarySoft }, pill]} />
      <Animated.View style={icon}><Feather name={ICONS[name]} size={21} color={focused ? c.secondary : c.textMuted} /></Animated.View>
      <AppText v="caption" color={focused ? 'secondary' : 'textMuted'} style={{ fontSize: 10.5, fontWeight: focused ? '700' : '500', marginTop: 5 }}>{label}</AppText>
    </Pressable>
  );
};

export const TabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 14, right: 14, bottom: Math.max(insets.bottom, 10) }}>
      <View style={[{ flexDirection: 'row', backgroundColor: c.surface, borderRadius: 28, paddingHorizontal: 6, borderWidth: 1, borderColor: c.border }, shadow(c, 2)]}>
        {state.routes.map((r, i) => {
          const focused = state.index === i;
          return (
            <Tab key={r.key} name={r.name} label={descriptors[r.key].options.title ?? r.name} focused={focused}
              onPress={() => { const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true }); if (!focused && !e.defaultPrevented) { Haptics.selectionAsync().catch(() => undefined); navigation.navigate(r.name, r.params); } }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: r.key })} />
          );
        })}
      </View>
    </View>
  );
};
