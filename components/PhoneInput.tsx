import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { type Country, COUNTRIES } from './CountryPicker';

export interface PhoneInputProps {
  selectedCountry: Country | null;
  phoneExtension: string;
  phoneNumber: string;
  onExtensionChange: (extension: string) => void;
  onPhoneNumberChange: (number: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

// Common phone extensions for manual selection
const COMMON_EXTENSIONS = [
  '+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36',
  '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49',
  '+51', '+52', '+53', '+54', '+55', '+56', '+57', '+58', '+60', '+61',
  '+62', '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90',
  '+91', '+92', '+93', '+94', '+95', '+212', '+213', '+216', '+218', '+220',
  '+221', '+222', '+223', '+224', '+225', '+226', '+227', '+228', '+229', '+230',
  '+231', '+232', '+233', '+234', '+235', '+236', '+237', '+238', '+239', '+240',
  '+241', '+242', '+243', '+244', '+245', '+246', '+248', '+249', '+250', '+251',
  '+252', '+253', '+254', '+255', '+256', '+257', '+258', '+260', '+261', '+262',
  '+263', '+264', '+265', '+266', '+267', '+268', '+269', '+290', '+291', '+297',
  '+298', '+299', '+350', '+351', '+352', '+353', '+354', '+355', '+356', '+357',
  '+358', '+359', '+370', '+371', '+372', '+373', '+374', '+375', '+376', '+377',
  '+378', '+380', '+381', '+382', '+383', '+385', '+386', '+387', '+389', '+420',
  '+421', '+423', '+500', '+501', '+502', '+503', '+504', '+505', '+506', '+507',
  '+508', '+509', '+590', '+591', '+592', '+593', '+594', '+595', '+596', '+597',
  '+598', '+599', '+670', '+672', '+673', '+674', '+675', '+676', '+677', '+678',
  '+679', '+680', '+681', '+682', '+683', '+685', '+686', '+687', '+688', '+689',
  '+690', '+691', '+692', '+850', '+852', '+853', '+855', '+856', '+880', '+886',
  '+960', '+961', '+962', '+963', '+964', '+965', '+966', '+967', '+968', '+970',
  '+971', '+972', '+973', '+974', '+975', '+976', '+977', '+992', '+993', '+994',
  '+995', '+996', '+998',
];

export function PhoneInput({
  selectedCountry,
  phoneExtension,
  phoneNumber,
  onExtensionChange,
  onPhoneNumberChange,
  error,
  placeholder,
  disabled = false,
}: PhoneInputProps) {
  const colors = useThemeColors();
  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [extensionSearchQuery, setExtensionSearchQuery] = useState('');

  // Auto-update extension when country changes
  useEffect(() => {
    if (selectedCountry && selectedCountry.phoneExtension !== phoneExtension) {
      onExtensionChange(selectedCountry.phoneExtension);
    }
  }, [selectedCountry, phoneExtension, onExtensionChange]);

  // Filter extensions based on search (by extension number or country name)
  const filteredExtensions = useMemo(() => {
    const list = (() => {
      const commonSet = new Set(COMMON_EXTENSIONS);
      const others = COUNTRIES.map(c => c.phoneExtension)
        .filter((ext, index, self) => self.indexOf(ext) === index)
        .filter(ext => !commonSet.has(ext))
        .sort();
      return [...COMMON_EXTENSIONS, ...others];
    })();
    if (!extensionSearchQuery.trim()) {
      return list;
    }
    const queryLower = extensionSearchQuery.toLowerCase();
    const queryDigits = queryLower.replace(/\D/g, '');
    return list.filter(ext => {
      const extDigits = ext.replace(/\D/g, '');
      const matchByNumber = queryDigits.length > 0 && extDigits.includes(queryDigits);
      const country = COUNTRIES.find(c => c.phoneExtension === ext);
      const matchByCountryName = country && country.name.toLowerCase().includes(queryLower);
      return matchByNumber || matchByCountryName;
    });
  }, [extensionSearchQuery]);

  // Format phone number (numbers only, max 15 digits per E.164)
  const handlePhoneNumberChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 15);
    onPhoneNumberChange(digitsOnly);
  };

  const handleSelectExtension = (extension: string) => {
    onExtensionChange(extension);
    setExtensionModalVisible(false);
    setExtensionSearchQuery('');
  };

  const isExtensionDisabled = disabled;

  return (
    <View style={styles.container}>
      <View style={styles.phoneContainer}>
        {/* Extension Dropdown */}
        <TouchableOpacity
          style={[
            styles.extensionButton,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
            error && styles.extensionButtonError,
            isExtensionDisabled && [styles.extensionButtonDisabled, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }],
          ]}
          onPress={() => !isExtensionDisabled && setExtensionModalVisible(true)}
          disabled={isExtensionDisabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.extensionText,
              { color: colors.textPrimary },
              isExtensionDisabled && [styles.extensionTextDisabled, { color: colors.textTertiary }],
            ]}
          >
            {phoneExtension || t('auth.selectExtension')}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={colors.textTertiary}
          />
        </TouchableOpacity>

        {/* Phone Number Input */}
        <TextInput
          style={[
            styles.phoneInput,
            { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary },
            error && styles.phoneInputError,
            disabled && [styles.phoneInputDisabled, { backgroundColor: colors.surfaceSecondary, color: colors.textTertiary }],
          ]}
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange}
          placeholder={placeholder || t('auth.phoneNumberPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          editable={!disabled}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Extension Selection Modal */}
      <Modal
        visible={extensionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setExtensionModalVisible(false);
          setExtensionSearchQuery('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('auth.selectExtension')}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setExtensionModalVisible(false);
                    setExtensionSearchQuery('');
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder={t('auth.searchExtension')}
                  placeholderTextColor={colors.textTertiary}
                  value={extensionSearchQuery}
                  onChangeText={setExtensionSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {extensionSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setExtensionSearchQuery('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Extensions List */}
              <FlatList
                data={filteredExtensions}
                keyExtractor={(item) => item}
                renderItem={({ item: ext }) => {
                  const country = COUNTRIES.find(c => c.phoneExtension === ext);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.extensionItem,
                        phoneExtension === ext && [styles.extensionItemSelected, { backgroundColor: `${colors.primary}33` }],
                      ]}
                      onPress={() => handleSelectExtension(ext)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.extensionItemText,
                          { color: colors.textPrimary },
                          phoneExtension === ext && [styles.extensionItemTextSelected, { color: colors.primary }],
                        ]}
                      >
                        {ext}
                      </Text>
                      <Text style={[styles.extensionItemCountry, { color: colors.textSecondary }]}>
                        {country ? country.name : '\u2014'}
                      </Text>
                      {phoneExtension === ext && (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.extensionsList}
                contentContainerStyle={styles.extensionsListContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  extensionButton: {
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 100,
  },
  extensionButtonError: {
    borderColor: '#EF4444',
  },
  extensionButtonDisabled: {
    backgroundColor: '#1a1a2e',
    borderColor: '#374151',
  },
  extensionText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  extensionTextDisabled: {
    color: '#9CA3AF',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#FFFFFF',
  },
  phoneInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#2d1a1a',
  },
  phoneInputDisabled: {
    backgroundColor: '#1a1a2e',
    color: '#9CA3AF',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252542',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  extensionsList: {
    maxHeight: 400,
  },
  extensionsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  extensionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  extensionItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  extensionItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    minWidth: 60,
  },
  extensionItemTextSelected: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  extensionItemCountry: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 12,
  },
});

