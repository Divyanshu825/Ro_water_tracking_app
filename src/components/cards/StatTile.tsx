import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '../common/Card';
import { AppText } from '../common/Text';
import { Icon, IconName } from '../common/Icon';
import { CountUp } from '../common/Misc';

export const StatTile = ({ icon, label, value, format, tint, bg, onPress, index = 0 }: { icon: IconName; label: string; value: number; format?: (n: number) => string; tint: string; bg: string; onPress?: () => void; index?: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 60).duration(420)} style={{ flex: 1, minWidth: '46%' }}>
    <Card onPress={onPress} pad={14} style={{ gap: 10 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={tint} />
      </View>
      <View>
        <CountUp value={value} format={format} v="h2" />
        <AppText v="caption" color="textMuted">{label}</AppText>
      </View>
    </Card>
  </Animated.View>
);
