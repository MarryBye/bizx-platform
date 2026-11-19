import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView
} from 'react-native';
import { MaterialIcon } from './MaterialIcon';

interface MobileCountry {
  iso: string;
  name: string;
  nameUk: string;
  dialCode: string;
  flag: string;
  placeholder: string;
  maxDigits: number;
  groups: number[];
}

const COUNTRIES: MobileCountry[] = [
  { iso: 'UA', name: 'Ukraine', nameUk: 'Україна', dialCode: '380', flag: '🇺🇦', placeholder: '(67) 123-45-67', maxDigits: 9, groups: [2, 3, 2, 2] },
  { iso: 'PL', name: 'Poland', nameUk: 'Польща', dialCode: '48', flag: '🇵🇱', placeholder: '512 345 678', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'DE', name: 'Germany', nameUk: 'Німеччина', dialCode: '49', flag: '🇩🇪', placeholder: '151 2345 6789', maxDigits: 11, groups: [3, 4, 4] },
  { iso: 'GB', name: 'United Kingdom', nameUk: 'Велика Британія', dialCode: '44', flag: '🇬🇧', placeholder: '7700 900123', maxDigits: 10, groups: [4, 6] },
  { iso: 'US', name: 'United States', nameUk: 'США', dialCode: '1', flag: '🇺🇸', placeholder: '(555) 123-4567', maxDigits: 10, groups: [3, 3, 4] },
  { iso: 'CZ', name: 'Czechia', nameUk: 'Чехія', dialCode: '420', flag: '🇨🇿', placeholder: '601 123 456', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'FR', name: 'France', nameUk: 'Франція', dialCode: '33', flag: '🇫🇷', placeholder: '6 12 34 56 78', maxDigits: 9, groups: [1, 2, 2, 2, 2] },
  { iso: 'IT', name: 'Italy', nameUk: 'Італія', dialCode: '39', flag: '🇮🇹', placeholder: '312 345 6789', maxDigits: 10, groups: [3, 3, 4] },
  { iso: 'ES', name: 'Spain', nameUk: 'Іспанія', dialCode: '34', flag: '🇪🇸', placeholder: '612 345 678', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'MD', name: 'Moldova', nameUk: 'Молдова', dialCode: '373', flag: '🇲🇩', placeholder: '68 123 456', maxDigits: 8, groups: [2, 3, 3] }
];

function formatNational(digits: string, country: MobileCountry): string {
  const clean = digits.replace(/\D/g, '').slice(0, country.maxDigits);
  if (!clean) return '';

  if (country.iso === 'UA' || country.iso === 'US') {
    const [g0, g1, g2, g3] = country.groups;
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
  return parts.join(' ');
}

function parsePhone(raw?: string | null): { country: MobileCountry; national: string } {
  const fallback = COUNTRIES[0];
  if (!raw) return { country: fallback, national: '' };
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { country: fallback, national: '' };

  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (digits.startsWith(c.dialCode)) {
      return {
        country: c,
        national: digits.slice(c.dialCode.length, c.dialCode.length + c.maxDigits)
      };
    }
  }
  return { country: fallback, national: digits.slice(0, fallback.maxDigits) };
}

interface MobilePhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  locale?: 'uk' | 'en';
}

export const MobilePhoneInput: React.FC<MobilePhoneInputProps> = ({
  value,
  onChange,
  locale = 'uk'
}) => {
  const initial = parsePhone(value);
  const [country, setCountry] = useState<MobileCountry>(initial.country);
  const [national, setNational] = useState<string>(initial.national);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const expected = national ? `+${country.dialCode}${national}` : '';
    const incoming = value ? `+${value.replace(/\D/g, '')}` : '';
    if (incoming !== expected) {
      const next = parsePhone(value);
      setCountry(next.country);
      setNational(next.national);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, country.maxDigits);
    setNational(digits);
    onChange(digits ? `+${country.dialCode}${digits}` : '');
  };

  const handleSelectCountry = (c: MobileCountry) => {
    setCountry(c);
    const trimmed = national.slice(0, c.maxDigits);
    setNational(trimmed);
    onChange(trimmed ? `+${c.dialCode}${trimmed}` : '');
    setModalVisible(false);
  };

  return (
    <>
      <View className="flex-row items-center border border-slate-300 rounded-xl bg-white overflow-hidden">
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          className="flex-row items-center gap-1 px-3 py-2.5 bg-slate-50 border-r border-slate-200"
        >
          <Text className="text-base">{country.flag}</Text>
          <Text className="text-xs font-bold text-slate-800">+{country.dialCode}</Text>
          <MaterialIcon name="keyboard-arrow-down" size={16} color="#64748b" />
        </TouchableOpacity>

        <TextInput
          value={formatNational(national, country)}
          onChangeText={handleChangeText}
          placeholder={country.placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          className="flex-1 px-3 py-2.5 text-xs text-slate-900 font-medium"
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <SafeAreaView className="bg-white rounded-t-2xl max-h-[70%]">
            <View className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between">
              <Text className="text-sm font-black text-slate-900">
                {locale === 'en' ? 'Select country code' : 'Оберіть код країни'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcon name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.iso}
              renderItem={({ item }) => {
                const isSelected = item.iso === country.iso;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectCountry(item)}
                    className={`flex-row items-center justify-between px-5 py-3.5 border-b border-slate-100 ${
                      isSelected ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <Text className="text-lg">{item.flag}</Text>
                      <Text className="text-sm font-semibold text-slate-900">
                        {locale === 'en' ? item.name : item.nameUk}
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-slate-500">+{item.dialCode}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};
