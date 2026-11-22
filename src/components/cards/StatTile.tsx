import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInLeft, ZoomIn } from 'react-native-reanimated';
import { Card } from '../common/Card';
import { AppText } from '../common/Text';
import { Icon, IconName } from '../common/Icon';
import { CountUp } from '../common/Misc';
import { radius, useTheme } from '../../theme';

export const StatTile = ({ icon, label, value, format, tint, bg, onPress, index = 0 }: { icon: IconName; label: string; value: number; format?: (n: number) => string; tint: string; bg: string; onPress?: () => void; index?: number }) => {
  const c = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(420)} style={{ flex: 1, minWidth: '46%' }}>
      <Card onPress={onPress} pad={0} flat>
        <View style={{ padding: 14, gap: 14, borderRadius: radius.lg, overflow: 'hidden' }}>
          <Animated.View pointerEvents="none" entering={FadeInLeft.delay(index * 60 + 250).duration(600)} style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 3, backgroundColor: tint, opacity: 0.55 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Animated.View entering={ZoomIn.delay(index * 60 + 150).springify().damping(10)} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon} size={19} color={tint} />
            </Animated.View>
            {onPress ? (
              <Animated.View entering={FadeIn.delay(index * 60 + 400).duration(400)} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrow-up-right" size={14} color={c.textMuted} />
              </Animated.View>
            ) : null}
          </View>
          <View style={{ gap: 2 }}>
            <CountUp value={value} format={format} v="h1" />
            <AppText v="caption" color="textMuted" numberOfLines={1} style={{ fontWeight: '600' }}>{label}</AppText>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
};
