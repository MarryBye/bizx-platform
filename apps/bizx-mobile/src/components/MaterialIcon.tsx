import React from 'react';
import MaterialIconsRaw from '@expo/vector-icons/MaterialIcons';

export interface MaterialIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({ name, size = 20, color = '#000000', style }) => {
  const IconComponent = MaterialIconsRaw as any;
  return <IconComponent name={name} size={size} color={color} style={style} />;
};
