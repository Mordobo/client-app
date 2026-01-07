import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PaymentMethod {
  id: string;
  type: 'card' | 'apple_pay' | 'google_pay';
  label: string;
  last4?: string;
  brand?: string;
  expiryDate?: string;
  isDefault: boolean;
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'card_1',
      type: 'card',
      label: 'Visa •••• 2388',
      last4: '2388',
      brand: 'Visa',
      expiryDate: '12/25',
      isDefault: true,
    },
    {
      id: 'card_2',
      type: 'card',
      label: 'Mastercard •••• 8823',
      last4: '8823',
      brand: 'Mastercard',
      expiryDate: '08/24',
      isDefault: false,
    },
  ]);

  const handleAddPaymentMethod = () => {
    Alert.alert(
      t('common.info'),
      'Add payment method functionality will be available soon.'
    );
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        isDefault: method.id === id,
      }))
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(methods => methods.filter(m => m.id !== id));
          },
        },
      ]
    );
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return 'card-outline';
      case 'mastercard':
        return 'card-outline';
      default:
        return 'card-outline';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptyText}>
              Add a payment method to make bookings easier
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddPaymentMethod}
            >
              <Text style={styles.addButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {paymentMethods.map((method, index) => (
              <View
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  index === paymentMethods.length - 1 && styles.lastCard,
                ]}
              >
                <View style={styles.paymentMethodInfo}>
                  <Ionicons
                    name={getCardIcon(method.brand) as any}
                    size={32}
                    color="#3B82F6"
                  />
                  <View style={styles.paymentMethodDetails}>
                    <View style={styles.paymentMethodHeader}>
                      <Text style={styles.paymentMethodLabel}>{method.label}</Text>
                      {method.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                    </View>
                    {method.expiryDate && (
                      <Text style={styles.paymentMethodExpiry}>
                        Expires {method.expiryDate}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.paymentMethodActions}>
                  {!method.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(method.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(method.id)}
                  >
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addNewButton}
              onPress={handleAddPaymentMethod}
            >
              <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
              <Text style={styles.addNewButtonText}>Add New Payment Method</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastCard: {
    marginBottom: 16,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodDetails: {
    marginLeft: 16,
    flex: 1,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentMethodExpiry: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  addNewButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

