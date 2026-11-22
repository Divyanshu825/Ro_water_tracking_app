import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppSelector } from '../store/hooks';

export interface Palette {
  isDark: boolean;
  background: string; surface: string; surfaceAlt: string; border: string;
  text: string; textMuted: string;
  primary: string; onPrimary: string; secondary: string; accent: string;
  primarySoft: string; secondarySoft: string;
  success: string; successSoft: string; warning: string; warningSoft: string; error: string; errorSoft: string;
  gradient: [string, string]; heroGradient: [string, string, string];
  shadow: string; overlay: string;
}

const light: Palette = {
  isDark: false,
  background: '#EDF3F9', surface: '#FFFFFF', surfaceAlt: '#F4F8FC', border: '#E1E9F2',
  text: '#0B1F44', textMuted: '#67788F',
  primary: '#0B1F44', onPrimary: '#FFFFFF', secondary: '#1E9FD8', accent: '#06C2D6',
  primarySoft: '#E4EAF5', secondarySoft: '#E0F2FB',
  success: '#16A34A', successSoft: '#DDF5E5', warning: '#E39A0B', warningSoft: '#FCF0D6', error: '#DC2626', errorSoft: '#FBE3E3',
  gradient: ['#1E9FD8', '#06C2D6'], heroGradient: ['#0B1F44', '#12427E', '#1E9FD8'],
  shadow: '#0B1F44', overlay: 'rgba(7,18,40,0.5)',
};

const dark: Palette = {
  isDark: true,
  background: '#081224', surface: '#10213B', surfaceAlt: '#162A48', border: '#21395C',
  text: '#EAF1FB', textMuted: '#8DA2BF',
  primary: '#38BDF8', onPrimary: '#06182E', secondary: '#38BDF8', accent: '#22D3EE',
  primarySoft: '#173254', secondarySoft: '#123A57',
  success: '#34D399', successSoft: '#10342B', warning: '#FBBF24', warningSoft: '#3A2F10', error: '#F87171', errorSoft: '#40191B',
  gradient: ['#1E9FD8', '#06C2D6'], heroGradient: ['#0A1B38', '#12427E', '#1E9FD8'],
  shadow: '#000000', overlay: 'rgba(0,0,0,0.65)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

const ThemeContext = createContext<Palette>(light);
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const pref = useAppSelector((s) => s.settings.theme);
  const system = useColorScheme();
  const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';
  const value = useMemo(() => (isDark ? dark : light), [isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
export const useTheme = () => useContext(ThemeContext);

export const shadow = (c: Palette, level: 1 | 2 = 1) => ({
  shadowColor: c.shadow,
  shadowOpacity: c.isDark ? 0.35 : level === 1 ? 0.07 : 0.14,
  shadowRadius: level === 1 ? 10 : 18,
  shadowOffset: { width: 0, height: level === 1 ? 3 : 8 },
  elevation: level === 1 ? 2 : 6,
});

export const statusColor = (c: Palette, status: string) => {
  switch (status) {
    case 'delivered': case 'active': case 'paid': return { fg: c.success, bg: c.successSoft };
    case 'cancelled': case 'failed': case 'expired': case 'unpaid': return { fg: c.error, bg: c.errorSoft };
    case 'pending': case 'paused': case 'partial': case 'upcoming': return { fg: c.warning, bg: c.warningSoft };
    case 'out_for_delivery': return { fg: c.accent, bg: c.secondarySoft };
    default: return { fg: c.secondary, bg: c.secondarySoft };
  }
};
