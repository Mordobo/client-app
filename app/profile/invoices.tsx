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

interface Invoice {
  id: string;
  orderId: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  service: string;
  supplier: string;
}

export default function InvoicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'inv_001',
      orderId: 'ORD-12345',
      date: '2024-01-15',
      amount: 230.00,
      status: 'paid',
      service: 'Plumbing Repair',
      supplier: 'John Smith Plumbing',
    },
    {
      id: 'inv_002',
      orderId: 'ORD-12346',
      date: '2024-01-20',
      amount: 150.00,
      status: 'pending',
      service: 'Electrical Installation',
      supplier: 'Electric Solutions Inc.',
    },
    {
      id: 'inv_003',
      orderId: 'ORD-12347',
      date: '2024-01-10',
      amount: 89.50,
      status: 'paid',
      service: 'HVAC Maintenance',
      supplier: 'Cool Air Services',
    },
  ]);

  const handleInvoicePress = (invoice: Invoice) => {
    Alert.alert(
      'Invoice Details',
      `Invoice: ${invoice.id}\nOrder: ${invoice.orderId}\nAmount: $${invoice.amount.toFixed(2)}\nStatus: ${invoice.status}`,
      [{ text: t('common.ok') }]
    );
  };

  const handleDownload = (invoice: Invoice) => {
    Alert.alert(
      t('common.info'),
      'Download invoice functionality will be available soon.'
    );
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'overdue':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'checkmark-circle';
      case 'pending':
        return 'time-outline';
      case 'overdue':
        return 'alert-circle';
      default:
        return 'help-circle-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoices</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {invoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Invoices</Text>
            <Text style={styles.emptyText}>
              Your invoices will appear here once you complete bookings
            </Text>
          </View>
        ) : (
          <>
            {invoices.map((invoice, index) => (
              <TouchableOpacity
                key={invoice.id}
                style={[
                  styles.invoiceCard,
                  index === invoices.length - 1 && styles.lastCard,
                ]}
                onPress={() => handleInvoicePress(invoice)}
              >
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceId}>{invoice.id}</Text>
                    <Text style={styles.invoiceDate}>
                      {formatDate(invoice.date)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(invoice.status)}15` },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(invoice.status) as any}
                      size={16}
                      color={getStatusColor(invoice.status)}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(invoice.status) },
                      ]}
                    >
                      {invoice.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceDetails}>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceLabel}>Service:</Text>
                    <Text style={styles.invoiceValue}>{invoice.service}</Text>
                  </View>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceLabel}>Supplier:</Text>
                    <Text style={styles.invoiceValue}>{invoice.supplier}</Text>
                  </View>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceLabel}>Order ID:</Text>
                    <Text style={styles.invoiceValue}>{invoice.orderId}</Text>
                  </View>
                </View>

                <View style={styles.invoiceFooter}>
                  <Text style={styles.invoiceAmount}>
                    ${invoice.amount.toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(invoice)}
                  >
                    <Ionicons name="download-outline" size={20} color="#3B82F6" />
                    <Text style={styles.downloadButtonText}>Download</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
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
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lastCard: {
    marginBottom: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceDetails: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  invoiceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  invoiceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    gap: 6,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

