import React from 'react';
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from 'react-native-svg';

export const Logo = ({ size = 72, mono }: { size?: number; mono?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={mono ? '#FFFFFF' : '#5CE1F5'} />
        <Stop offset="1" stopColor={mono ? '#FFFFFF' : '#1E9FD8'} />
      </LinearGradient>
    </Defs>
    <Path d="M50 6 C50 6 20 40 20 62 C20 80 33 94 50 94 C67 94 80 80 80 62 C80 40 50 6 50 6 Z" fill="url(#g)" />
    <Path d="M30 64 C38 58 44 70 52 64 C60 58 66 70 72 64 L72 66 C72 80 62 88 50 88 C38 88 30 80 30 66 Z" fill="#FFFFFF" opacity={0.35} />
    <Circle cx="40" cy="42" r="5" fill="#FFFFFF" opacity={0.55} />
  </Svg>
);
