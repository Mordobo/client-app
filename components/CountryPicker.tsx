import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export interface Country {
  code: string;
  name: string;
  flag?: string;
  phoneExtension: string; // e.g., "+1", "+34", "+52"
}

// MVP: Predefined list of countries with phone extensions
export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', phoneExtension: '+1' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', phoneExtension: '+1' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', phoneExtension: '+52' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', phoneExtension: '+34' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', phoneExtension: '+57' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', phoneExtension: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phoneExtension: '+56' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', phoneExtension: '+51' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', phoneExtension: '+58' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', phoneExtension: '+593' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', phoneExtension: '+502' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', phoneExtension: '+506' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', phoneExtension: '+507' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', phoneExtension: '+504' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', phoneExtension: '+505' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', phoneExtension: '+503' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', phoneExtension: '+53' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', phoneExtension: '+1' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', phoneExtension: '+591' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', phoneExtension: '+595' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', phoneExtension: '+598' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', phoneExtension: '+55' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', phoneExtension: '+1' },
];

interface CountryPickerProps {
  selectedCountry: Country | null;
  onSelectCountry: (country: Country) => void;
  error?: string;
  placeholder?: string;
}

export function CountryPicker({
  selectedCountry,
  onSelectCountry,
  error,
  placeholder,
}: CountryPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return COUNTRIES;
    }
    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      country =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectCountry = (country: Country) => {
    onSelectCountry(country);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          {
            backgroundColor: '#FFFFFF',
            borderColor: '#E5E7EB',
          },
          error && styles.pickerButtonError,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.pickerContent}>
          {selectedCountry ? (
            <View style={styles.selectedCountry}>
              {selectedCountry.flag && (
                <Text style={styles.flag}>{selectedCountry.flag}</Text>
              )}
              <Text style={[styles.selectedText, { color: '#1F2937' }]}>
                {selectedCountry.name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.placeholderText, { color: 'rgba(55, 65, 81, 0.45)' }]}>
              {placeholder || t('auth.selectCountry')}
            </Text>
          )}
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </View>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('auth.selectCountry')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('auth.searchCountry')}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Countries List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCountry?.code === item.code && styles.countryItemSelected,
                  ]}
                  onPress={() => handleSelectCountry(item)}
                  activeOpacity={0.7}
                >
                  {item.flag && <Text style={styles.countryFlag}>{item.flag}</Text>}
                  <Text
                    style={[
                      styles.countryName,
                      selectedCountry?.code === item.code && styles.countryNameSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedCountry?.code === item.code && (
                    <Ionicons name="checkmark" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.countryList}
              contentContainerStyle={styles.countryListContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  pickerButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerButtonError: {
    borderColor: '#F87171',
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCountry: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  selectedText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    fontSize: 16,
    color: 'rgba(55, 65, 81, 0.45)',
    flex: 1,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Platform.OS === 'ios' ? '80%' : '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    minHeight: Platform.OS === 'android' ? 400 : undefined,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  countryList: {
    flex: 1,
  },
  countryListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  countryItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  countryNameSelected: {
    fontWeight: '600',
    color: '#10B981',
  },
});

