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
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(user?.avatar || null);
  
  // Update imageUri when user.avatar changes (e.g., after loading from storage)
  React.useEffect(() => {
    if (user?.avatar && user.avatar !== imageUri) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:32',message:'Updating imageUri from user.avatar',data:{hasUserAvatar:!!user?.avatar,avatarType:user?.avatar?.startsWith('data:')?'base64':user?.avatar?.startsWith('blob:')?'blob':user?.avatar?.startsWith('http')?'url':'other'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'O'})}).catch(()=>{});
      // #endregion
      setImageUri(user.avatar);
    }
  }, [user?.avatar]);
  
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:40',message:'Component mounted, checking user avatar',data:{hasUser:!!user,hasAvatar:!!user?.avatar,avatarType:user?.avatar?.startsWith('data:')?'base64':user?.avatar?.startsWith('blob:')?'blob':user?.avatar?.startsWith('http')?'url':'other',avatarLength:user?.avatar?.length,imageUriType:imageUri?.startsWith('data:')?'base64':imageUri?.startsWith('blob:')?'blob':'other'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'O'})}).catch(()=>{});
  }, [user, imageUri]);
  // #endregion

  const [formData, setFormData] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    email: user?.email || '',
    phoneNumber: user?.phone || '',
    address: '',
  });

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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:72',message:'Image selected',data:{uri,isBlob:uri.startsWith('blob:'),isDataUri:uri.startsWith('data:'),isFileUri:uri.startsWith('file:'),platform:Platform.OS,hasFileSystem:typeof FileSystem !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Convert image to base64 for persistence
        try {
          let dataUri: string;
          
          // For web with blob URIs, use fetch to convert to base64
          if (Platform.OS === 'web' && uri.startsWith('blob:')) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:80',message:'Web blob URI detected, using fetch',data:{uri},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:95',message:'Web blob conversion successful',data:{dataUriLength:dataUri.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
          } else if (uri.startsWith('data:')) {
            // Already a data URI, use it directly
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:99',message:'Already data URI, using directly',data:{uri},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            dataUri = uri;
          } else {
            // For native platforms, use FileSystem
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:104',message:'Using FileSystem for native',data:{uri},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            if (typeof FileSystem === 'undefined') {
              throw new Error('FileSystem is not available');
            }
            // Use 'base64' as string encoding option
            // In expo-file-system v19, encoding is specified as a string literal
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            } as { encoding: 'base64' });
            dataUri = `data:image/jpeg;base64,${base64}`;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:112',message:'FileSystem conversion successful',data:{dataUriLength:dataUri.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
          }
          
          setImageUri(dataUri);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:117',message:'Image URI set successfully',data:{dataUriLength:dataUri.length,startsWithData:dataUri.startsWith('data:')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
        } catch (error) {
          console.error('Error converting image to base64:', error);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:121',message:'Base64 conversion failed',data:{error:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:109',message:'handleSave called',data:{hasUser:!!user,formDataFullName:formData.fullName,userFullName:`${user?.firstName} ${user?.lastName}`,hasImageUri:!!imageUri,imageUriType:imageUri?.startsWith('data:')?'base64':imageUri?.startsWith('blob:')?'blob':'other'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'P'})}).catch(()=>{});
    // #endregion
    if (!user) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:111',message:'No user found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'P'})}).catch(()=>{});
      // #endregion
      Alert.alert(t('common.error'), t('errors.userNotFound'));
      return;
    }

    setLoading(true);
    try {
      const updatePayload: {
        fullName?: string;
        email?: string;
        phoneNumber?: string;
        address?: string;
        profileImage?: string;
      } = {};

      // Only include fields that have changed and are not empty
      const currentFullName = `${user.firstName} ${user.lastName}`.trim();
      const newFullName = formData.fullName.trim();
      const fullNameChanged = newFullName && newFullName !== currentFullName;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:130',message:'Checking field changes',data:{currentFullName,newFullName,fullNameChanged,emailChanged:formData.email.trim() !== user.email,phoneChanged:formData.phoneNumber.trim() !== (user.phone || ''),imageChanged:imageUri && imageUri !== user.avatar},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'Q'})}).catch(()=>{});
      // #endregion
      
      if (fullNameChanged) {
        updatePayload.fullName = newFullName;
      }
      if (formData.email.trim() && formData.email.trim() !== user.email) {
        updatePayload.email = formData.email.trim();
      }
      if (formData.phoneNumber.trim() !== (user.phone || '')) {
        updatePayload.phoneNumber = formData.phoneNumber.trim();
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
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:148',message:'Payload built',data:{payloadKeys:Object.keys(updatePayload),payload:updatePayload,imageChanged,hasChanges},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'Q'})}).catch(()=>{});
      // #endregion

      if (!hasChanges) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:153',message:'No changes detected, returning early',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'R'})}).catch(()=>{});
        // #endregion
        Alert.alert('No Changes', 'No changes to save');
        setLoading(false);
        return;
      }

      // Call the API with all changes (including image if changed)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:162',message:'Calling updateProfile API',data:{payload:updatePayload,hasImage:!!updatePayload.profileImage},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'S'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:137',message:'Saving avatar to user',data:{hasImageUri:!!imageUri,imageUriType:imageUri?.startsWith('data:')?'base64':imageUri?.startsWith('blob:')?'blob':'other',updatedAvatarType:updatedAvatar?.startsWith('data:')?'base64':updatedAvatar?.startsWith('blob:')?'blob':'other',updatedAvatarLength:updatedAvatar?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'N'})}).catch(()=>{});
      // #endregion
      
      const updatedUser = {
        ...user,
        firstName,
        lastName,
        email: apiUser.email || user.email,
        phone: apiUser.phone_number || user.phone,
        avatar: updatedAvatar, // This will be base64 data URI if image was selected
      };

      await updateUser(updatedUser);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'edit.tsx:149',message:'User updated in AsyncStorage',data:{avatarSaved:!!updatedUser.avatar,avatarType:updatedUser.avatar?.startsWith('data:')?'base64':updatedUser.avatar?.startsWith('blob:')?'blob':'other'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'N'})}).catch(()=>{});
      // #endregion

      Alert.alert(
        t('common.ok'),
        t('profile.profileUpdated'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]
      );
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.editProfileTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.content}
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
                  <Ionicons name="person" size={50} color="#9CA3AF" />
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
                style={styles.input}
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
                style={styles.input}
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
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('profile.phoneNumber')}</Text>
                <TouchableOpacity onPress={() => {}}>
                  <Text style={styles.changePasswordLink}>
                    {t('profile.changePassword')}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={formData.phoneNumber}
                onChangeText={(text) =>
                  setFormData({ ...formData, phoneNumber: text })
                }
                placeholder={t('profile.phoneNumber')}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.address')}</Text>
              <TextInput
                style={styles.input}
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
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>{t('profile.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
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
    color: '#6B7280',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
