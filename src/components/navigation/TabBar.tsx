import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { shadow, useTheme } from '../../theme';
import { AppText } from '../common/Text';

const ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = { Home: 'home', Customers: 'users', Orders: 'shopping-bag', Inventory: 'package', More: 'grid' };

const Tab = ({ name, label, focused, onPress, onLongPress }: { name: string; label: string; focused: boolean; onPress: () => void; onLongPress: () => void }) => {
  const c = useTheme();
  const s = useSharedValue(focused ? 1 : 0);
  useEffect(() => { s.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 180 }); }, [focused, s]);
  const pill = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ scale: 0.85 + s.value * 0.15 }] }));
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -Math.sin(s.value * Math.PI) * 4 }, { scale: 1 + s.value * 0.1 }] }));
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }} onPress={onPress} onLongPress={onLongPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 56 }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 3, right: 3, top: 3, bottom: 3, borderRadius: 20, shadowColor: c.secondary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, pill]}>
        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 20 }} />
      </Animated.View>
      <Animated.View style={icon}><Feather name={ICONS[name]} size={20} color={focused ? '#fff' : c.textMuted} /></Animated.View>
      <AppText v="caption" color={focused ? '#fff' : 'textMuted'} numberOfLines={1} style={{ fontSize: 10.5, fontWeight: focused ? '700' : '500', marginTop: 4 }}>{label}</AppText>
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
