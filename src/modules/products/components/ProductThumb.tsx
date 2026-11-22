import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../../../theme';

export const ProductThumb = ({ uri, size = 52 }: { uri?: string; size?: number }) => {
  const c = useTheme();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: c.border }} accessibilityLabel="Product image" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: c.secondarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 100 100">
        <Defs><LinearGradient id="pt" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#5CE1F5" /><Stop offset="1" stopColor="#1E9FD8" /></LinearGradient></Defs>
        <Path d="M50 6 C50 6 20 40 20 62 C20 80 33 94 50 94 C67 94 80 80 80 62 C80 40 50 6 50 6 Z" fill="url(#pt)" />
      </Svg>
    </View>
  );
};
