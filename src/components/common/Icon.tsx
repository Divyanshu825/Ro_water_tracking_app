import React from 'react';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export type IconName = React.ComponentProps<typeof Feather>['name'];
export const Icon = ({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) => {
  const c = useTheme();
  return <Feather name={name} size={size} color={color ?? c.text} />;
};
