import { createPayment, ApiError as PaymentApiError } from '@/services/payments';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PaymentMethod = 'card' | 'apple_pay' | 'google_pay';

export default function PaymentScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [processing, setProcessing] = useState(false);

  const paymentMethods = [
    {
      id: 'card_2388' as const,
      type: 'card' as PaymentMethod,
      label: '**** 2388',
      icon: 'card',
      brand: 'Visa',
    },
    {
      id: 'card_8823' as const,
      type: 'card' as PaymentMethod,
      label: '**** 8823',
      icon: 'card',
      brand: 'Mastercard',
    },
  ];

  const handlePayment = async () => {
    try {
      setProcessing(true);
      
      await createPayment({
        order_id: orderId,
        amount: 230,
        provider: selectedMethod,
      });

      router.push(`/booking/success/${orderId}`);
    } catch (err) {
      if (err instanceof PaymentApiError) {
        alert(err.message);
      } else {
        alert('Payment failed');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Saved Cards */}
        <View style={styles.section}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethodCard,
                selectedMethod === method.type && styles.paymentMethodCardSelected,
              ]}
              onPress={() => setSelectedMethod(method.type)}
            >
              <View style={styles.paymentMethodIcon}>
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={selectedMethod === method.type ? '#3B82F6' : '#6B7280'}
                />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodLabel}>{method.label}</Text>
                <Text style={styles.paymentMethodBrand}>{method.brand}</Text>
              </View>
              {selectedMethod === method.type && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
              <TouchableOpacity style={styles.removeButton}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Digital Wallets */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              selectedMethod === 'apple_pay' && styles.paymentMethodCardSelected,
            ]}
            onPress={() => setSelectedMethod('apple_pay')}
          >
            <View style={styles.paymentMethodIcon}>
              <Ionicons name="logo-apple" size={24} color="#000000" />
            </View>
            <Text style={styles.paymentMethodLabel}>Apple Pay</Text>
            {selectedMethod === 'apple_pay' && (
              <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              selectedMethod === 'google_pay' && styles.paymentMethodCardSelected,
            ]}
            onPress={() => setSelectedMethod('google_pay')}
          >
            <View style={styles.paymentMethodIcon}>
              <Ionicons name="logo-google" size={24} color="#4285F4" />
            </View>
            <Text style={styles.paymentMethodLabel}>Google Pay</Text>
            {selectedMethod === 'google_pay' && (
              <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
            )}
          </TouchableOpacity>
        </View>

        {/* Add New Card */}
        <TouchableOpacity style={styles.addCardButton}>
          <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
          <Text style={styles.addCardText}>Add New Card</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, processing && styles.continueButtonDisabled]}
          onPress={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continue to Payment</Text>
          )}
        </TouchableOpacity>
      </View>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  paymentMethodCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentMethodBrand: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  removeButton: {
    marginLeft: 12,
  },
  removeText: {
    fontSize: 14,
    color: '#EF4444',
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    margin: 20,
  },
  addCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});









