import React from 'react';
import {
  Crown,
  Shield,
  Briefcase,
  Zap,
  Headphones,
  Coffee,
  Package,
  BarChart3,
  ShoppingBag,
  Wrench,
  Users,
  KeyRound,
  Star,
  Flame,
  Award,
  Sliders,
  Truck,
  Tag,
  type LucideIcon
} from 'lucide-react';

export const ROLE_ICON_MAP: Record<string, LucideIcon> = {
  crown: Crown,
  shield: Shield,
  briefcase: Briefcase,
  zap: Zap,
  headphones: Headphones,
  coffee: Coffee,
  package: Package,
  'bar-chart': BarChart3,
  'shopping-bag': ShoppingBag,
  wrench: Wrench,
  users: Users,
  key: KeyRound,
  star: Star,
  flame: Flame,
  award: Award,
  sliders: Sliders,
  truck: Truck,
  tag: Tag
};

export const ROLE_ICON_OPTIONS = Object.keys(ROLE_ICON_MAP);

export interface RoleIconProps {
  icon?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Единый рендерер векторных иконок ролей (lucide-react).
 * При icon === null / '' не рендерит ничего (вариант «без иконки»).
 */
export const RoleIcon: React.FC<RoleIconProps> = ({ icon, className = 'w-4 h-4', style }) => {
  if (!icon || !Object.prototype.hasOwnProperty.call(ROLE_ICON_MAP, icon)) return null;
  const IconComp = ROLE_ICON_MAP[icon];
  if (!IconComp) return null;
  return <IconComp className={className} style={style} />;
};
