import { COUNTRIES, CountryPicker, type Country } from '@/components/CountryPicker';
import { PhoneInput } from '@/components/PhoneInput';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { updateProfile } from '@/services/profile';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(user?.avatar || null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Helper to find country by name (supports partial matches for flexibility)
  const findCountryByName = (countryName: string | undefined): Country | null => {
    if (!countryName) return null;
    const normalizedName = countryName.trim();
    
    // First try exact match
    let found = COUNTRIES.find(c => c.name === normalizedName);
    if (found) return found;
    
    // Try case-insensitive match
    found = COUNTRIES.find(c => c.name.toLowerCase() === normalizedName.toLowerCase());
    if (found) return found;
    
    // Try partial match (e.g., "Dominican" matches "Dominican Republic")
    found = COUNTRIES.find(c => 
      c.name.toLowerCase().includes(normalizedName.toLowerCase()) ||
      normalizedName.toLowerCase().includes(c.name.toLowerCase())
    );
    
    return found || null;
  };

  // Helper to parse phone number (extract extension and number)
  const parsePhoneNumber = (phone: string | undefined, country: Country | null): { extension: string; number: string } => {
    if (!phone) return { extension: '', number: '' };
    
    // Remove all non-digit characters except the leading +
    const cleanedPhone = phone.trim();
    
    // Get all unique phone extensions from COUNTRIES, sorted by length (longest first)
    // This ensures we match longer extensions first (e.g., +593 before +5)
    const allExtensions = Array.from(new Set(COUNTRIES.map(c => c.phoneExtension)))
      .sort((a, b) => b.length - a.length);
    
    // Try to match against known extensions (longest first)
    for (const ext of allExtensions) {
      if (cleanedPhone.startsWith(ext)) {
        const number = cleanedPhone.substring(ext.length).replace(/\D/g, '');
        return { extension: ext, number };
      }
    }
    
    // If no known extension matches, try to use country's extension if available
    if (country?.phoneExtension && cleanedPhone.startsWith(country.phoneExtension)) {
      const number = cleanedPhone.substring(country.phoneExtension.length).replace(/\D/g, '');
      return { extension: country.phoneExtension, number };
    }
    
    // If country has extension but phone doesn't start with it, assume extension is missing
    if (country?.phoneExtension) {
      // If phone is all digits (no +), assume it's just the number
      const digitsOnly = cleanedPhone.replace(/\D/g, '');
      if (digitsOnly === cleanedPhone.replace(/\+/g, '')) {
        return { extension: country.phoneExtension, number: digitsOnly };
      }
    }
    
    // Fallback: try generic pattern match (1-4 digits after +)
    const extensionMatch = cleanedPhone.match(/^(\+\d{1,4})/);
    if (extensionMatch) {
      const extension = extensionMatch[1];
      const number = cleanedPhone.substring(extension.length).replace(/\D/g, '');
      return { extension, number };
    }
    
    // If no extension found, return empty extension and all digits as number
    return { extension: '', number: cleanedPhone.replace(/\D/g, '') };
  };

  // Initialize formData with user data
  const initializeFormData = (userData: typeof user) => {
    if (!userData) {
      return {
        fullName: '',
        email: '',
        phoneExtension: '',
        phoneNumber: '',
        address: '',
        country: null as Country | null,
      };
    }
    
    const foundCountry = findCountryByName(userData.country);
    console.log('[EditProfile] Initializing formData - user.country:', userData.country, 'foundCountry:', foundCountry?.name || 'null');
    
    // Parse phone number to extract extension and number (pass country for better parsing)
    const parsedPhone = parsePhoneNumber(userData.phone, foundCountry);
    const phoneExtension = parsedPhone.extension || foundCountry?.phoneExtension || '';
    const phoneNumber = parsedPhone.number;
    
    return {
      fullName: `${userData.firstName} ${userData.lastName}`.trim(),
      email: userData.email || '',
      phoneExtension,
      phoneNumber,
      address: '',
      country: foundCountry || null,
    };
  };

  const [formData, setFormData] = useState(() => initializeFormData(user));

  // Update imageUri when user.avatar changes (e.g., after loading from storage)
  React.useEffect(() => {
    if (user?.avatar && user.avatar !== imageUri) {
      setImageUri(user.avatar);
    }
  }, [user?.avatar]);

  // Update formData when user data changes (especially after sync from backend)
  React.useEffect(() => {
    console.log('[EditProfile] useEffect triggered - user changed:', {
      hasUser: !!user,
      userId: user?.id,
      country: user?.country,
      countryType: typeof user?.country,
      firstName: user?.firstName,
      lastName: user?.lastName,
    });
    
    if (user) {
      const foundCountry = findCountryByName(user.country);
      console.log('[EditProfile] findCountryByName - input:', JSON.stringify(user.country), 'output:', foundCountry ? JSON.stringify(foundCountry) : 'null');
      
      // Log all countries for debugging
      if (!foundCountry && user.country) {
        console.log('[EditProfile] Country not found in list. Available countries:', COUNTRIES.slice(0, 10).map(c => c.name).join(', '), '...');
        console.log('[EditProfile] Searching for partial match of:', user.country);
      }
      
      const newFullName = `${user.firstName} ${user.lastName}`.trim();
      const newCountry = foundCountry || null;
      
      // Parse phone number to extract extension and number (pass country for better parsing)
      const parsedPhone = parsePhoneNumber(user.phone, newCountry);
      const phoneExtension = parsedPhone.extension || foundCountry?.phoneExtension || '';
      const phoneNumber = parsedPhone.number;
      
      setFormData(prev => {
        const shouldUpdate = 
          prev.fullName !== newFullName ||
          prev.email !== (user.email || '') ||
          prev.phoneExtension !== phoneExtension ||
          prev.phoneNumber !== phoneNumber ||
          prev.country?.name !== newCountry?.name;
        
        if (shouldUpdate) {
          console.log('[EditProfile] Updating formData - prev.country:', prev.country?.name || 'null', 'newCountry:', newCountry?.name || 'null');
          return {
            fullName: newFullName,
            email: user.email || '',
            phoneExtension,
            phoneNumber,
            address: prev.address, // Preserve address if user hasn't set it
            country: newCountry,
          };
        }
        
        console.log('[EditProfile] No update needed - formData already matches user');
        return prev;
      });
    } else {
      console.log('[EditProfile] useEffect triggered but user is null - resetting formData');
      setFormData({
        fullName: '',
        email: '',
        phoneExtension: '',
        phoneNumber: '',
        address: '',
        country: null,
      });
    }
  }, [user?.id, user?.country, user?.firstName, user?.lastName, user?.email, user?.phone]);

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          'Permission to access camera roll is required!'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        
        // Convert image to base64 for persistence
        try {
          let dataUri: string;
          
          // For web with blob URIs, use fetch to convert to base64
          if (Platform.OS === 'web' && uri.startsWith('blob:')) {
            const response = await fetch(uri);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                const base64 = reader.result as string;
                // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64Data = base64.split(',')[1] || base64;
                resolve(base64Data);
              };
              reader.onerror = reject;
            });
            reader.readAsDataURL(blob);
            const base64Data = await base64Promise;
            dataUri = `data:image/jpeg;base64,${base64Data}`;
          } else if (uri.startsWith('data:')) {
            // Already a data URI, use it directly
            dataUri = uri;
          } else {
            // For native platforms, use FileSystem
            if (typeof FileSystem === 'undefined') {
              throw new Error('FileSystem is not available');
            }
            // Use 'base64' as string encoding option
            // In expo-file-system v19, encoding is specified as a string literal
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            } as { encoding: 'base64' });
            dataUri = `data:image/jpeg;base64,${base64}`;
          }
          
          setImageUri(dataUri);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          Alert.alert(t('common.error'), t('errors.imageUploadFailed'));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('errors.imageUploadFailed'));
    }
  };

  const handleUseLocation = async () => {
    // TODO: Implement location picker
    Alert.alert(
      'Coming Soon',
      'Location picker will be available soon'
    );
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert(t('common.error'), t('errors.userNotFound'));
      return;
    }

    setLoading(true);
    try {
      const updatePayload: {
        fullName?: string;
        email?: string;
        phoneNumber?: string;
        phoneExtension?: string;
        phoneNumberOnly?: string;
        address?: string;
        profileImage?: string;
        country?: string;
      } = {};

      // Only include fields that have changed and are not empty
      const currentFullName = `${user.firstName} ${user.lastName}`.trim();
      const newFullName = formData.fullName.trim();
      const fullNameChanged = newFullName && newFullName !== currentFullName;
      
      if (fullNameChanged) {
        updatePayload.fullName = newFullName;
      }
      if (formData.email.trim() && formData.email.trim() !== user.email) {
        updatePayload.email = formData.email.trim();
      }
      // Send extension and number separately to backend (new format)
      if (formData.phoneExtension && formData.phoneNumber) {
        // Validate phone number length (backend requires at least 6 characters for number only)
        if (formData.phoneNumber.trim().length < 6) {
          Alert.alert(
            t('common.error'),
            t('errors.phoneNumberTooShort') || 'Phone number must be at least 6 characters'
          );
          setLoading(false);
          return;
        }
        
        // Check if phone changed
        const currentPhone = user.phone || '';
        const newFullPhone = `${formData.phoneExtension}${formData.phoneNumber}`;
        if (newFullPhone !== currentPhone) {
          updatePayload.phoneExtension = formData.phoneExtension;
          updatePayload.phoneNumberOnly = formData.phoneNumber;
        }
      } else if (formData.phoneNumber) {
        // Fallback: if no extension but has number, send as old format
        const currentPhone = user.phone || '';
        if (formData.phoneNumber.trim() !== currentPhone) {
          updatePayload.phoneNumber = formData.phoneNumber.trim();
        }
      }
      // Handle country: send if country is selected and different from current, or if country was removed
      const currentCountry = user.country || '';
      const newCountry = formData.country?.name || '';
      if (newCountry !== currentCountry) {
        // Only send country if it's not empty, otherwise send empty string to clear it
        updatePayload.country = newCountry || '';
      }
      // Address is optional - only send if provided and not empty
      // Note: address column may not exist in database yet
      // if (formData.address.trim()) {
      //   updatePayload.address = formData.address.trim();
      // }

      // Check if image changed and add it to payload if so
      const imageChanged = imageUri && imageUri !== user.avatar;
      if (imageChanged && imageUri.startsWith('data:')) {
        // Only send base64 data URIs to backend
        updatePayload.profileImage = imageUri;
      }
      
      const hasChanges = Object.keys(updatePayload).length > 0;

      if (!hasChanges) {
        Alert.alert('No Changes', 'No changes to save');
        setLoading(false);
        return;
      }

      // Call the API with all changes (including image if changed)
      const response = await updateProfile(updatePayload);

      // Map backend response (snake_case) to app user format (camelCase)
      const apiUser = response.user;
      const fullNameParts = (apiUser.full_name || formData.fullName).split(/\s+/);
      const firstName = fullNameParts[0] || user.firstName;
      const lastName = fullNameParts.slice(1).join(' ') || user.lastName;

      // Update local user state
      // Use profile_image from backend if available, otherwise use imageUri if it was updated, otherwise keep existing avatar
      const updatedAvatar = (apiUser.profile_image as string | undefined) || 
                           (imageUri && imageUri !== user.avatar ? imageUri : user.avatar);
      
      const updatedUser = {
        ...user,
        firstName,
        lastName,
        email: apiUser.email || user.email,
        phone: apiUser.phone_number || user.phone,
        country: (apiUser.country as string | undefined) ?? user.country,
        avatar: updatedAvatar, // This will be base64 data URI if image was selected
      };

      await updateUser(updatedUser);

      // Show success toast with message from backend
      const successMessage = response.message || t('profile.profileUpdated');
      setToastMessage(successMessage);
      setToastVisible(true);
      
      // Navigate back after toast is visible (allow user to see the message)
      setTimeout(() => {
        router.back();
      }, 2500);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : t('errors.updateProfileFailed');
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Success Toast */}
        <Toast
          message={toastMessage}
          visible={toastVisible}
          onHide={() => setToastVisible(false)}
          type="success"
          duration={3000}
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.editProfileTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={[styles.content, { backgroundColor: '#1a1a2e' }]}
          contentContainerStyle={{ backgroundColor: '#1a1a2e' }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={handleImagePicker}
              style={styles.avatarContainer}
              activeOpacity={0.8}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={50} color="#9ca3af" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>{t('profile.tapToChangePhoto')}</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.fullName')}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937',
                    borderColor: '#D1D5DB',
                  },
                ]}
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullName: text })
                }
                placeholder={t('profile.fullName')}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.emailAddress')}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937',
                    borderColor: '#D1D5DB',
                  },
                ]}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                placeholder={t('profile.emailAddress')}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.country')}</Text>
              <CountryPicker
                selectedCountry={formData.country}
                onSelectCountry={(country) =>
                  setFormData({ ...formData, country })
                }
                placeholder={t('auth.selectCountry')}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('profile.phoneNumber')}</Text>
                <TouchableOpacity onPress={() => {}}>
                  <Text style={styles.changePasswordLink}>
                    {t('profile.changePassword')}
                  </Text>
                </TouchableOpacity>
              </View>
              <PhoneInput
                selectedCountry={formData.country}
                phoneExtension={formData.phoneExtension}
                phoneNumber={formData.phoneNumber}
                onExtensionChange={(extension) =>
                  setFormData({ ...formData, phoneExtension: extension })
                }
                onPhoneNumberChange={(number) =>
                  setFormData({ ...formData, phoneNumber: number })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.address')}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937',
                    borderColor: '#D1D5DB',
                  },
                ]}
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
                placeholder={t('profile.address')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
              <TouchableOpacity
                onPress={handleUseLocation}
                style={styles.locationButton}
              >
                <Ionicons name="location" size={16} color="#6B7280" />
                <Text style={styles.locationButtonText}>
                  {t('profile.useMyLocation')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={[styles.footer, { backgroundColor: '#252542', borderTopColor: '#374151' }]}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: '#252542',
                borderWidth: 1,
                borderColor: '#374151',
              },
            ]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: '#FFFFFF' }]}>
              {t('profile.cancel')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: '#3B82F6',
                opacity: loading ? 0.6 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>
                {t('profile.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Hardcode dark background like Home
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#252542', // Hardcode dark header
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // Hardcode dark border
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF', // Hardcode white text
  },
  content: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Hardcode dark background
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#252542', // Hardcode dark card
    marginBottom: 8,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontSize: 14,
    color: '#9ca3af', // Hardcode secondary text
  },
  formSection: {
    backgroundColor: '#252542', // Hardcode dark card
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF', // Hardcode white text
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  changePasswordLink: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151', // Hardcode dark border
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF', // Hardcode white text
    backgroundColor: '#2d2d4a', // Hardcode dark input background
    minHeight: 48,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#9ca3af', // Hardcode secondary text
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#252542', // Hardcode dark card
    borderTopWidth: 1,
    borderTopColor: '#374151', // Hardcode dark border
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
