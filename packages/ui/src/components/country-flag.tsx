import React from 'react';
import { cn } from '../lib/utils';

export interface CountryFlagProps {
  iso: string;
  className?: string;
}

/**
 * Crisp cross-platform inline SVG country flags (works on Windows where
 * Chrome/Edge render Unicode flag emojis as plain ISO letters like "UA").
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({ iso, className }) => {
  const code = iso.toUpperCase();
  const baseClass = cn(
    'inline-block w-5 h-3.5 rounded-[2px] overflow-hidden shrink-0 ring-1 ring-black/10',
    className
  );

  switch (code) {
    case 'UA':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="7" fill="#0057B7" />
          <rect y="7" width="20" height="7" fill="#FFD700" />
        </svg>
      );
    case 'GB':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="14" fill="#012169" />
          <path d="M0 0 L20 14 M20 0 L0 14" stroke="#FFFFFF" strokeWidth="2.6" />
          <path d="M0 0 L20 14 M20 0 L0 14" stroke="#C8102E" strokeWidth="1.2" />
          <path d="M10 0 V14 M0 7 H20" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M10 0 V14 M0 7 H20" stroke="#C8102E" strokeWidth="2.2" />
        </svg>
      );
    case 'PL':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="7" fill="#FFFFFF" />
          <rect y="7" width="20" height="7" fill="#DC143C" />
        </svg>
      );
    case 'DE':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="4.67" fill="#000000" />
          <rect y="4.67" width="20" height="4.67" fill="#DD0000" />
          <rect y="9.33" width="20" height="4.67" fill="#FFCE00" />
        </svg>
      );
    case 'US':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="14" fill="#FFFFFF" />
          <rect y="0" width="20" height="1.4" fill="#B22234" />
          <rect y="2.8" width="20" height="1.4" fill="#B22234" />
          <rect y="5.6" width="20" height="1.4" fill="#B22234" />
          <rect y="8.4" width="20" height="1.4" fill="#B22234" />
          <rect y="11.2" width="20" height="1.4" fill="#B22234" />
          <rect y="12.6" width="20" height="1.4" fill="#B22234" />
          <rect width="9" height="7.5" fill="#3C3B6E" />
        </svg>
      );
    case 'CA':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="14" fill="#FFFFFF" />
          <rect width="5" height="14" fill="#FF0000" />
          <rect x="15" width="5" height="14" fill="#FF0000" />
          <path d="M10 3 L11.2 6.2 L13 5.8 L11.7 8 L12.8 9 L10.5 8.8 L10.5 11 L9.5 11 L9.5 8.8 L7.2 9 L8.3 8 L7 5.8 L8.8 6.2 Z" fill="#FF0000" />
        </svg>
      );
    case 'CZ':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="7" fill="#FFFFFF" />
          <rect y="7" width="20" height="7" fill="#D7141A" />
          <polygon points="0,0 10,7 0,14" fill="#11457E" />
        </svg>
      );
    case 'FR':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="6.67" height="14" fill="#0055A4" />
          <rect x="6.67" width="6.67" height="14" fill="#FFFFFF" />
          <rect x="13.33" width="6.67" height="14" fill="#EF4135" />
        </svg>
      );
    case 'IT':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="6.67" height="14" fill="#009246" />
          <rect x="6.67" width="6.67" height="14" fill="#FFFFFF" />
          <rect x="13.33" width="6.67" height="14" fill="#CE2B37" />
        </svg>
      );
    case 'ES':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="14" fill="#AA151B" />
          <rect y="3.5" width="20" height="7" fill="#F1BF00" />
        </svg>
      );
    case 'MD':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="6.67" height="14" fill="#0046AE" />
          <rect x="6.67" width="6.67" height="14" fill="#FFD200" />
          <rect x="13.33" width="6.67" height="14" fill="#CC092F" />
          <circle cx="10" cy="7" r="1.6" fill="#7A4924" />
        </svg>
      );
    case 'RO':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="6.67" height="14" fill="#002B7F" />
          <rect x="6.67" width="6.67" height="14" fill="#FCD116" />
          <rect x="13.33" width="6.67" height="14" fill="#CE1126" />
        </svg>
      );
    case 'LT':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="4.67" fill="#FDB913" />
          <rect y="4.67" width="20" height="4.67" fill="#006A44" />
          <rect y="9.33" width="20" height="4.67" fill="#C1272D" />
        </svg>
      );
    case 'GE':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="14" fill="#FFFFFF" />
          <rect x="8.5" width="3" height="14" fill="#FF0000" />
          <rect y="5.5" width="20" height="3" fill="#FF0000" />
          <rect x="3.5" y="2" width="1.4" height="1.4" fill="#FF0000" />
          <rect x="15" y="2" width="1.4" height="1.4" fill="#FF0000" />
          <rect x="3.5" y="10.5" width="1.4" height="1.4" fill="#FF0000" />
          <rect x="15" y="10.5" width="1.4" height="1.4" fill="#FF0000" />
        </svg>
      );
    case 'TR':
      return (
        <svg viewBox="0 0 20 14" className={baseClass} aria-hidden="true">
          <rect width="20" height="14" fill="#E30A17" />
          <circle cx="8" cy="7" r="3.4" fill="#FFFFFF" />
          <circle cx="9.1" cy="7" r="2.7" fill="#E30A17" />
          <polygon points="12.5,5.6 13,6.8 14.2,6.8 13.2,7.5 13.6,8.7 12.5,8 11.4,8.7 11.8,7.5 10.8,6.8 12,6.8" fill="#FFFFFF" />
        </svg>
      );
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center justify-center w-5 h-3.5 rounded-[2px] bg-slate-200 text-[8px] font-bold text-slate-700 shrink-0',
            className
          )}
        >
          {code.slice(0, 2)}
        </span>
      );
  }
};
