import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AccountType = 'client' | 'provider';

/**
 * First step of sign-up: the user picks how they want to start — find services
 * (client) or offer services (provider). This is only the starting point, NOT an
 * exclusive choice: a user keeps both roles available and can switch later via
 * switch-mode (a client can become a provider through onboarding and vice versa). (MDB-444)
 */
export default function AccountTypeScreen() {
  const choose = (accountType: AccountType) => {
    router.push({ pathname: '/(auth)/register', params: { accountType } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.accountType.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.accountType.subtitle')}</Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => choose('client')}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <Ionicons name="search" size={28} color="#3B82F6" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{t('auth.accountType.clientTitle')}</Text>
              <Text style={styles.cardDesc}>{t('auth.accountType.clientDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => choose('provider')}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
              <Ionicons name="construct" size={28} color="#10B981" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{t('auth.accountType.providerTitle')}</Text>
              <Text style={styles.cardDesc}>{t('auth.accountType.providerDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>{t('auth.accountType.switchNote')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 16, paddingBottom: 40 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  header: { marginTop: 24, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9CA3AF', lineHeight: 21 },
  options: { gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#374151',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  note: { marginTop: 'auto', fontSize: 13, color: '#6B7280', textAlign: 'center' },
});
