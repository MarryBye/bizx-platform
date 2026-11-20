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
import {
  SHARED_PHONE_COUNTRIES,
  formatNationalPhoneNumber,
  parseSharedPhoneNumber,
  type SharedPhoneCountry
} from '@bizx/utils';
import { MaterialIcon } from './MaterialIcon';

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
  const initial = parseSharedPhoneNumber(value);
  const [country, setCountry] = useState<SharedPhoneCountry>(initial.country);
  const [national, setNational] = useState<string>(initial.nationalDigits);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const expected = national ? `+${country.dialCode}${national}` : '';
    const incoming = value ? `+${value.replace(/\D/g, '')}` : '';
    if (incoming !== expected) {
      const next = parseSharedPhoneNumber(value);
      setCountry(next.country);
      setNational(next.nationalDigits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, country.maxDigits);
    setNational(digits);
    onChange(digits ? `+${country.dialCode}${digits}` : '');
  };

  const handleSelectCountry = (c: SharedPhoneCountry) => {
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
          value={formatNationalPhoneNumber(national, country)}
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
              data={SHARED_PHONE_COUNTRIES}
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
