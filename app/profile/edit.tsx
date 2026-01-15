import { Toast } from '@/components/Toast';
import { PhoneInput } from '@/components/PhoneInput';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { COUNTRIES, CountryPicker, type Country } from '@/components/CountryPicker';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(user?.avatar || null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Helper to find country by name
  const findCountryByName = (countryName: string | undefined): Country | null => {
    if (!countryName) return null;
    const normalizedName = countryName.trim();
    let found = COUNTRIES.find(c => c.name === normalizedName);
    if (found) return found;
    found = COUNTRIES.find(c => c.name.toLowerCase() === normalizedName.toLowerCase());
    if (found) return found;
    found = COUNTRIES.find(c => 
      c.name.toLowerCase().includes(normalizedName.toLowerCase()) ||
      normalizedName.toLowerCase().includes(c.name.toLowerCase())
    );
    return found || null;
  };

  // Helper to parse phone number
  const parsePhoneNumber = (phone: string | undefined, country: Country | null): { extension: string; number: string } => {
    if (!phone) return { extension: '', number: '' };
    const cleanedPhone = phone.trim();
    const allExtensions = Array.from(new Set(COUNTRIES.map(c => c.phoneExtension)))
      .sort((a, b) => b.length - a.length);
    for (const ext of allExtensions) {
      if (cleanedPhone.startsWith(ext)) {
        const number = cleanedPhone.substring(ext.length).replace(/\D/g, '');
        return { extension: ext, number };
      }
    }
    if (country?.phoneExtension && cleanedPhone.startsWith(country.phoneExtension)) {
      const number = cleanedPhone.substring(country.phoneExtension.length).replace(/\D/g, '');
      return { extension: country.phoneExtension, number };
    }
    if (country?.phoneExtension) {
      const digitsOnly = cleanedPhone.replace(/\D/g, '');
      if (digitsOnly === cleanedPhone.replace(/\+/g, '')) {
        return { extension: country.phoneExtension, number: digitsOnly };
      }
    }
    const extensionMatch = cleanedPhone.match(/^(\+\d{1,4})/);
    if (extensionMatch) {
      const extension = extensionMatch[1];
      const number = cleanedPhone.substring(extension.length).replace(/\D/g, '');
      return { extension, number };
    }
    return { extension: '', number: cleanedPhone.replace(/\D/g, '') };
  };

  // Parse date string to Date object
  const parseDate = (dateString: string | undefined): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Format date for display
  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${date.getDate()} de ${months[date.getMonth()]}, ${date.getFullYear()}`;
  };

  // Initialize formData with user data
  const initializeFormData = (userData: typeof user) => {
    if (!userData) {
      return {
        firstName: '',
        lastName: '',
        email: '',
        phoneExtension: '',
        phoneNumber: '',
        dateOfBirth: null as Date | null,
        gender: undefined as 'male' | 'female' | undefined,
        country: null as Country | null,
      };
    }
    
    const foundCountry = findCountryByName(userData.country);
    const parsedPhone = parsePhoneNumber(userData.phone, foundCountry);
    const phoneExtension = parsedPhone.extension || foundCountry?.phoneExtension || '';
    const phoneNumber = parsedPhone.number;
    const dateOfBirth = parseDate(userData.dateOfBirth);

    return {
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phoneExtension,
      phoneNumber,
      dateOfBirth,
      gender: userData.gender,
      country: foundCountry || null,
    };
  };

  const [formData, setFormData] = useState(() => initializeFormData(user));


  // Update formData when user data changes
  React.useEffect(() => {
    if (user) {
      const foundCountry = findCountryByName(user.country);
      const parsedPhone = parsePhoneNumber(user.phone, foundCountry);
      const phoneExtension = parsedPhone.extension || foundCountry?.phoneExtension || '';
      const phoneNumber = parsedPhone.number;
      const dateOfBirth = parseDate(user.dateOfBirth);

      setFormData(prev => {
        const shouldUpdate = 
          prev.firstName !== (user.firstName || '') ||
          prev.lastName !== (user.lastName || '') ||
          prev.email !== (user.email || '') ||
          prev.phoneExtension !== phoneExtension ||
          prev.phoneNumber !== phoneNumber ||
          prev.dateOfBirth?.getTime() !== dateOfBirth?.getTime() ||
          prev.gender !== user.gender ||
          prev.country?.name !== foundCountry?.name;
        
        if (shouldUpdate) {
          return {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phoneExtension,
            phoneNumber,
            dateOfBirth,
            gender: user.gender,
            country: foundCountry || null,
          };
        }
        return prev;
      });
    }
  }, [user?.id, user?.firstName, user?.lastName, user?.email, user?.phone, user?.dateOfBirth, user?.gender, user?.country]);

  // Update imageUri when user.avatar changes
  React.useEffect(() => {
    if (user?.avatar && user.avatar !== imageUri) {
      setImageUri(user.avatar);
    }
  }, [user?.avatar]);

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
        
        try {
          let dataUri: string;
          
          if (Platform.OS === 'web' && uri.startsWith('blob:')) {
            const response = await fetch(uri);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                const base64 = reader.result as string;
                const base64Data = base64.split(',')[1] || base64;
                resolve(base64Data);
              };
              reader.onerror = reject;
            });
            reader.readAsDataURL(blob);
            const base64Data = await base64Promise;
            dataUri = `data:image/jpeg;base64,${base64Data}`;
          } else if (uri.startsWith('data:')) {
            dataUri = uri;
          } else {
            if (typeof FileSystem === 'undefined') {
              throw new Error('FileSystem is not available');
            }
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

  const handleDateChange = (event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event && (event as { type: string }).type === 'set' && selectedDate) {
        console.log('[EditProfile] Date selected (Android):', selectedDate, 'ISO:', selectedDate.toISOString().split('T')[0]);
        setFormData({ ...formData, dateOfBirth: selectedDate });
      }
    } else {
      // iOS: update date as user scrolls
      if (selectedDate) {
        console.log('[EditProfile] Date selected (iOS):', selectedDate, 'ISO:', selectedDate.toISOString().split('T')[0]);
        setFormData({ ...formData, dateOfBirth: selectedDate });
      }
    }
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
        phoneExtension?: string;
        phoneNumberOnly?: string;
        profileImage?: string;
        country?: string;
        gender?: 'male' | 'female';
        dateOfBirth?: string;
      } = {};

      // Check if name changed
      const currentFullName = `${user.firstName} ${user.lastName}`.trim();
      const newFullName = `${formData.firstName} ${formData.lastName}`.trim();
      if (newFullName && newFullName !== currentFullName) {
        updatePayload.fullName = newFullName;
      }

      // Check if email changed
      if (formData.email.trim() && formData.email.trim() !== user.email) {
        updatePayload.email = formData.email.trim();
      }

      // Check if phone changed
      if (formData.phoneExtension && formData.phoneNumber) {
        if (formData.phoneNumber.trim().length < 6) {
          Alert.alert(
            t('common.error'),
            t('errors.phoneNumberTooShort') || 'Phone number must be at least 6 characters'
          );
          setLoading(false);
          return;
        }
        const currentPhone = user.phone || '';
        const newFullPhone = `${formData.phoneExtension}${formData.phoneNumber}`;
        if (newFullPhone !== currentPhone) {
          updatePayload.phoneExtension = formData.phoneExtension;
          updatePayload.phoneNumberOnly = formData.phoneNumber;
        }
      }

      // Check if country changed
      const currentCountry = user.country || '';
      const newCountry = formData.country?.name || '';
      if (newCountry !== currentCountry) {
        updatePayload.country = newCountry || '';
      }

      // Check if gender changed
      // Include gender if:
      // 1. User selected a gender and it's different from current
      // 2. User had no gender and selected one
      // 3. User had a gender and cleared it (formData.gender is undefined but user.gender is not)
      if (formData.gender !== user.gender) {
        updatePayload.gender = formData.gender;
      }

      // Check if date of birth changed
      // Normalize current date of birth to YYYY-MM-DD format
      let currentDateOfBirth = '';
      if (user.dateOfBirth) {
        try {
          const currentDate = new Date(user.dateOfBirth);
          if (!isNaN(currentDate.getTime())) {
            currentDateOfBirth = currentDate.toISOString().split('T')[0];
          }
        } catch (e) {
          // If parsing fails, treat as empty
          currentDateOfBirth = '';
        }
      }
      
      const newDateOfBirth = formData.dateOfBirth ? formData.dateOfBirth.toISOString().split('T')[0] : '';
      
      console.log('[EditProfile] Date of birth check:', {
        userDateOfBirth: user.dateOfBirth,
        currentDateOfBirth,
        formDataDateOfBirth: formData.dateOfBirth,
        newDateOfBirth,
        areDifferent: newDateOfBirth !== currentDateOfBirth,
      });
      
      // Include dateOfBirth if:
      // 1. User selected a date (newDateOfBirth is not empty) and it's different from current
      // 2. User had a date and cleared it (newDateOfBirth is empty but currentDateOfBirth is not)
      // 3. User is setting a date for the first time (newDateOfBirth is not empty and currentDateOfBirth is empty)
      if (newDateOfBirth && newDateOfBirth !== currentDateOfBirth) {
        updatePayload.dateOfBirth = newDateOfBirth;
        console.log('[EditProfile] Adding dateOfBirth to payload:', newDateOfBirth);
      } else if (!newDateOfBirth && currentDateOfBirth) {
        // User cleared the date - send empty string to clear it in backend
        updatePayload.dateOfBirth = '';
        console.log('[EditProfile] Clearing dateOfBirth in payload');
      }

      // Check if image changed
      const imageChanged = imageUri && imageUri !== user.avatar;
      if (imageChanged && imageUri.startsWith('data:')) {
        updatePayload.profileImage = imageUri;
      }
      
      const hasChanges = Object.keys(updatePayload).length > 0;

      console.log('[EditProfile] Update payload:', updatePayload);
      console.log('[EditProfile] Has changes:', hasChanges);

      if (!hasChanges) {
        Alert.alert('No Changes', 'No changes to save');
        setLoading(false);
        return;
      }

      // Call the API
      console.log('[EditProfile] Calling updateProfile with payload:', updatePayload);
      const response = await updateProfile(updatePayload);
      console.log('[EditProfile] Update response:', response);

      // Map backend response to app user format
      const apiUser = response.user;
      const fullNameParts = (apiUser.full_name || newFullName).split(/\s+/);
      const firstName = fullNameParts[0] || user.firstName;
      const lastName = fullNameParts.slice(1).join(' ') || user.lastName;

      const updatedAvatar = (apiUser.profile_image as string | undefined) || 
                           (imageUri && imageUri !== user.avatar ? imageUri : user.avatar);
      
      const updatedUser = {
        ...user,
        firstName,
        lastName,
        email: apiUser.email || user.email,
        phone: apiUser.phone_number || user.phone,
        country: (apiUser.country as string | undefined) ?? user.country,
        gender: (apiUser.gender as 'male' | 'female' | undefined) ?? formData.gender ?? user.gender,
        dateOfBirth: (apiUser.date_of_birth as string | undefined) ?? newDateOfBirth ?? user.dateOfBirth,
        avatar: updatedAvatar,
      };

      await updateUser(updatedUser);

      const successMessage = response.message || t('profile.profileUpdated');
      setToastMessage(successMessage);
      setToastVisible(true);
      
      setTimeout(() => {
        router.back();
      }, 2500);
    } catch (error: unknown) {
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
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={styles.saveButtonHeader}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
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
                  <Ionicons name="person" size={40} color="#9ca3af" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleImagePicker}>
              <Text style={styles.changePhotoText}>{t('profile.changePhoto')}</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.firstName')}</Text>
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(text) =>
                  setFormData({ ...formData, firstName: text })
                }
                placeholder={t('profile.firstName')}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.lastName')}</Text>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(text) =>
                  setFormData({ ...formData, lastName: text })
                }
                placeholder={t('profile.lastName')}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.emailAddress')}</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                placeholder={t('profile.emailAddress')}
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.phone')}</Text>
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

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.dateOfBirth')}</Text>
              {Platform.OS === 'web' ? (
                // Web: Use native HTML date input wrapped in a div
                React.createElement('div', {
                  style: {
                    width: '100%',
                  },
                }, React.createElement('input', {
                  type: 'date',
                  value: formData.dateOfBirth ? formData.dateOfBirth.toISOString().split('T')[0] : '',
                  max: new Date().toISOString().split('T')[0],
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    const text = e.target.value;
                    if (text) {
                      const date = new Date(text + 'T00:00:00'); // Add time to avoid timezone issues
                      if (!isNaN(date.getTime())) {
                        setFormData({ ...formData, dateOfBirth: date });
                      }
                    } else {
                      setFormData({ ...formData, dateOfBirth: null });
                    }
                  },
                  style: {
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#252542',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    minHeight: '48px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  },
                  placeholder: t('profile.dateOfBirth'),
                }))
              ) : (
                // Mobile: Use DateTimePicker
                <>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={[
                      styles.dateInputText,
                      !formData.dateOfBirth && styles.dateInputPlaceholder
                    ]}>
                      {formData.dateOfBirth ? formatDateForDisplay(formData.dateOfBirth) : t('profile.dateOfBirth')}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={formData.dateOfBirth || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      locale={Platform.OS === 'ios' ? 'es-ES' : undefined}
                    />
                  )}
                  {Platform.OS === 'ios' && showDatePicker && (
                    <View style={styles.iosDatePickerActions}>
                      <TouchableOpacity
                        style={styles.iosDatePickerButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.iosDatePickerButtonText}>{t('common.cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iosDatePickerButton, styles.iosDatePickerButtonPrimary]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={[styles.iosDatePickerButtonText, styles.iosDatePickerButtonTextPrimary]}>
                          {t('common.ok')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.gender')}</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderPill,
                    formData.gender === 'male' && styles.genderPillSelected
                  ]}
                  onPress={() => setFormData({ ...formData, gender: 'male' })}
                >
                  <Text style={[
                    styles.genderPillText,
                    formData.gender === 'male' && styles.genderPillTextSelected
                  ]}>
                    {t('profile.male')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderPill,
                    formData.gender === 'female' && styles.genderPillSelected
                  ]}
                  onPress={() => setFormData({ ...formData, gender: 'female' })}
                >
                  <Text style={[
                    styles.genderPillText,
                    formData.gender === 'female' && styles.genderPillTextSelected
                  ]}>
                    {t('profile.female')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
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
    backgroundColor: '#1a1a2e',
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
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  saveButtonHeader: {
    width: 60,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  content: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#1a1a2e',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#252542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1a1a2e',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 16,
    backgroundColor: '#252542',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 48,
  },
  dateInput: {
    width: '100%',
    padding: 16,
    backgroundColor: '#252542',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  dateInputPlaceholder: {
    color: '#9ca3af',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderPill: {
    flex: 1,
    padding: 14,
    backgroundColor: '#252542',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderPillSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
  },
  genderPillText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  genderPillTextSelected: {
    color: '#3b82f6',
  },
  iosDatePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  iosDatePickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#252542',
  },
  iosDatePickerButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  iosDatePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  iosDatePickerButtonTextPrimary: {
    color: '#FFFFFF',
  },
});
