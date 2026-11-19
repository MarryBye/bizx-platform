import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface PhoneCountry {
  iso: string;
  name: string;
  nameUk: string;
  dialCode: string; // digits only, e.g. '380'
  flag: string;
  placeholder: string;
  maxDigits: number;
  groups: number[]; // digit grouping, e.g. [2, 3, 2, 2] for UA (67) 123-45-67
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'UA', name: 'Ukraine', nameUk: 'Україна', dialCode: '380', flag: '🇺🇦', placeholder: '(67) 123-45-67', maxDigits: 9, groups: [2, 3, 2, 2] },
  { iso: 'PL', name: 'Poland', nameUk: 'Польща', dialCode: '48', flag: '🇵🇱', placeholder: '512 345 678', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'DE', name: 'Germany', nameUk: 'Німеччина', dialCode: '49', flag: '🇩🇪', placeholder: '151 2345 6789', maxDigits: 11, groups: [3, 4, 4] },
  { iso: 'GB', name: 'United Kingdom', nameUk: 'Велика Британія', dialCode: '44', flag: '🇬🇧', placeholder: '7700 900123', maxDigits: 10, groups: [4, 6] },
  { iso: 'US', name: 'United States', nameUk: 'США', dialCode: '1', flag: '🇺🇸', placeholder: '(555) 123-4567', maxDigits: 10, groups: [3, 3, 4] },
  { iso: 'CA', name: 'Canada', nameUk: 'Канада', dialCode: '1', flag: '🇨🇦', placeholder: '(416) 555-0123', maxDigits: 10, groups: [3, 3, 4] },
  { iso: 'CZ', name: 'Czechia', nameUk: 'Чехія', dialCode: '420', flag: '🇨🇿', placeholder: '601 123 456', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'FR', name: 'France', nameUk: 'Франція', dialCode: '33', flag: '🇫🇷', placeholder: '6 12 34 56 78', maxDigits: 9, groups: [1, 2, 2, 2, 2] },
  { iso: 'IT', name: 'Italy', nameUk: 'Італія', dialCode: '39', flag: '🇮🇹', placeholder: '312 345 6789', maxDigits: 10, groups: [3, 3, 4] },
  { iso: 'ES', name: 'Spain', nameUk: 'Іспанія', dialCode: '34', flag: '🇪🇸', placeholder: '612 345 678', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'MD', name: 'Moldova', nameUk: 'Молдова', dialCode: '373', flag: '🇲🇩', placeholder: '68 123 456', maxDigits: 8, groups: [2, 3, 3] },
  { iso: 'RO', name: 'Romania', nameUk: 'Румунія', dialCode: '40', flag: '🇷🇴', placeholder: '712 345 678', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'LT', name: 'Lithuania', nameUk: 'Литва', dialCode: '370', flag: '🇱🇹', placeholder: '612 34567', maxDigits: 8, groups: [3, 5] },
  { iso: 'GE', name: 'Georgia', nameUk: 'Грузія', dialCode: '995', flag: '🇬🇪', placeholder: '555 12 34 56', maxDigits: 9, groups: [3, 2, 2, 2] },
  { iso: 'TR', name: 'Turkey', nameUk: 'Туреччина', dialCode: '90', flag: '🇹🇷', placeholder: '532 123 45 67', maxDigits: 10, groups: [3, 3, 2, 2] }
];

export function formatNationalNumber(digits: string, country: PhoneCountry): string {
  const clean = digits.replace(/\D/g, '').slice(0, country.maxDigits);
  if (!clean) return '';

  if (country.iso === 'UA' || country.iso === 'US' || country.iso === 'CA') {
    const g0 = country.groups[0];
    const g1 = country.groups[1];
    const g2 = country.groups[2];
    const g3 = country.groups[3];
    const p0 = clean.slice(0, g0);
    const p1 = clean.slice(g0, g0 + g1);
    const p2 = clean.slice(g0 + g1, g0 + g1 + g2);
    const p3 = g3 ? clean.slice(g0 + g1 + g2, g0 + g1 + g2 + g3) : '';

    let out = `(${p0}`;
    if (clean.length > g0) out += `) ${p1}`;
    if (p2) out += `-${p2}`;
    if (p3) out += `-${p3}`;
    return out;
  }

  const parts: string[] = [];
  let cursor = 0;
  for (const len of country.groups) {
    if (cursor >= clean.length) break;
    parts.push(clean.slice(cursor, cursor + len));
    cursor += len;
  }
  if (cursor < clean.length) {
    parts.push(clean.slice(cursor));
  }
  return parts.join(' ');
}

export function parsePhoneToCountryAndNational(
  rawValue?: string | null,
  defaultIso = 'UA'
): { country: PhoneCountry; nationalDigits: string } {
  const fallback = PHONE_COUNTRIES.find((c) => c.iso === defaultIso) || PHONE_COUNTRIES[0];
  if (!rawValue) return { country: fallback, nationalDigits: '' };

  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return { country: fallback, nationalDigits: '' };

  // Sort by longest dialCode first so '380' matches before '3'
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (digits.startsWith(c.dialCode)) {
      return {
        country: c,
        nationalDigits: digits.slice(c.dialCode.length, c.dialCode.length + c.maxDigits)
      };
    }
  }

  return {
    country: fallback,
    nationalDigits: digits.slice(0, fallback.maxDigits)
  };
}

export interface PhoneInputProps {
  value: string;
  onChange: (e164Value: string) => void;
  disabled?: boolean;
  required?: boolean;
  locale?: 'uk' | 'en';
  defaultCountryIso?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  locale = 'uk',
  defaultCountryIso = 'UA',
  className,
  inputClassName,
  id
}) => {
  const parsed = parsePhoneToCountryAndNational(value, defaultCountryIso);
  const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(parsed.country);
  const [nationalDigits, setNationalDigits] = useState<string>(parsed.nationalDigits);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. when profile loads)
  useEffect(() => {
    const expectedE164 = nationalDigits ? `+${selectedCountry.dialCode}${nationalDigits}` : '';
    const cleanIncoming = value ? `+${value.replace(/\D/g, '')}` : '';
    if (cleanIncoming !== expectedE164) {
      const next = parsePhoneToCountryAndNational(value, selectedCountry.iso);
      setSelectedCountry(next.country);
      setNationalDigits(next.nationalDigits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Handle pasted full international number like "+380671234567"
    if (raw.trim().startsWith('+')) {
      const next = parsePhoneToCountryAndNational(raw, selectedCountry.iso);
      setSelectedCountry(next.country);
      setNationalDigits(next.nationalDigits);
      onChange(next.nationalDigits ? `+${next.country.dialCode}${next.nationalDigits}` : '');
      return;
    }
    const digits = raw.replace(/\D/g, '').slice(0, selectedCountry.maxDigits);
    setNationalDigits(digits);
    onChange(digits ? `+${selectedCountry.dialCode}${digits}` : '');
  };

  const handleSelectCountry = (country: PhoneCountry) => {
    setSelectedCountry(country);
    const trimmed = nationalDigits.slice(0, country.maxDigits);
    setNationalDigits(trimmed);
    onChange(trimmed ? `+${country.dialCode}${trimmed}` : '');
    setIsOpen(false);
    setSearch('');
  };

  const filteredCountries = PHONE_COUNTRIES.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameUk.toLowerCase().includes(q) ||
      c.iso.toLowerCase().includes(q) ||
      `+${c.dialCode}`.includes(q)
    );
  });

  const formattedDisplay = formatNationalNumber(nationalDigits, selectedCountry);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-stretch w-full border border-slate-300 rounded-lg bg-white overflow-hidden transition-colors focus-within:ring-1 focus-within:ring-slate-900 focus-within:border-slate-900',
          disabled && 'bg-slate-100 opacity-75'
        )}
      >
        {/* Country Code Dropdown Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-50 hover:bg-slate-100 border-r border-slate-200 text-xs font-semibold text-slate-800 shrink-0 transition-colors disabled:cursor-not-allowed"
          aria-label="Select country code"
        >
          <span className="text-base leading-none" aria-hidden="true">
            {selectedCountry.flag}
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-700">
            +{selectedCountry.dialCode}
          </span>
          <ChevronDown
            className={cn(
              'w-3 h-3 text-slate-400 transition-transform',
              isOpen && 'rotate-180 text-slate-700'
            )}
          />
        </button>

        {/* Formatted National Phone Input */}
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required={required}
          disabled={disabled}
          value={formattedDisplay}
          onChange={handleDigitsChange}
          placeholder={selectedCountry.placeholder}
          className={cn(
            'flex-1 min-w-0 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none disabled:cursor-not-allowed',
            inputClassName
          )}
        />
      </div>

      {/* Country Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 max-h-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === 'en' ? 'Search country or code...' : 'Пошук країни або коду...'}
                autoFocus
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>
          <div className="overflow-y-auto py-1">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                {locale === 'en' ? 'No countries found' : 'Країн не знайдено'}
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.iso === selectedCountry.iso;
                return (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors',
                      isSelected
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none shrink-0" aria-hidden="true">
                        {c.flag}
                      </span>
                      <span className="truncate">{locale === 'en' ? c.name : c.nameUk}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[11px] text-slate-500">+{c.dialCode}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
