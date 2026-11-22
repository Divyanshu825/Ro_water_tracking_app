import React from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { AppText } from './Text';

/** Water-ripple Lottie loader — used for blocking waits (sign-in, PDF generation). */
export const WaterLoader = ({ size = 96, label }: { size?: number; label?: string }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
    <LottieView source={require('../../assets/lottie/water-drop.json')} autoPlay loop style={{ width: size, height: size }} />
    {label ? <AppText v="label" color="textMuted">{label}</AppText> : null}
  </View>
);
