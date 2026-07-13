import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Truck, CheckCircle, ChevronLeft, MapPin } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDriverStore } from '../../src/store/useDriverStore';

const { width } = Dimensions.get('window');

// نظام الألوان الخاص بـ Ammarli
const COLORS = {
  NAVY: '#012047',
  YELLOW: '#FFCC00',
  BACKGROUND: '#F1F4F9',
  WHITE: '#FFFFFF',
  TEXT_MUTED: '#64748B',
  DIVIDER: '#E2E8F0',
};

export default function TripCompletionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId: string;
    serviceType: string;
    price: string;
    customerName: string;
  }>();

  const { orderId, serviceType, price, customerName } = params;
  const { completeDriverOrder } = useDriverStore();
  
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await completeDriverOrder();
      
      router.replace({
        pathname: '/(driver)/customer-rating',
        params: { orderId: orderId, customerName: customerName ?? 'العميل', price: price ?? '0' }
      });
    } catch (error) {
      console.error('Failed to complete order:', error);
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ملخص الرحلة</Text>
      </View>

      <View style={styles.content}>
        
        {/* Arrival Visual Icon */}
        <View style={styles.visualContainer}>
          <View style={styles.iconCircle}>
            <Truck size={60} color={COLORS.NAVY} strokeWidth={1.5} />
            <View style={styles.checkBadge}>
              <CheckCircle size={24} color={COLORS.YELLOW} fill={COLORS.NAVY} />
            </View>
          </View>
          <Text style={styles.arrivalStatus}>وصلت لوجهتك</Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>تم الوصول إلى موقع الزبون</Text>
            <MapPin size={20} color={COLORS.NAVY} />
          </View>
          
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{serviceType ?? 'مياه آبار'}</Text>
            <Text style={styles.infoLabel}>نوع الخدمة:</Text>
          </View>

          <View style={[styles.infoRow, { marginTop: 15 }]}>
            <Text style={styles.totalValue}>{price ? `${Number(price).toLocaleString('ar-DZ')} د.ج` : '0 د.ج'}</Text>
            <Text style={styles.infoLabel}>المبلغ الإجمالي:</Text>
          </View>
        </View>

        {/* Muted Confirmation Text */}
        <Text style={styles.confirmationText}>
          تأكد من تسليم الطلبية واستلام المبلغ قبل إنهاء الرحلة.
        </Text>

      </View>

      {/* Buttons Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.primaryButton, isLoading && { opacity: 0.8 }]} 
          activeOpacity={0.8}
          onPress={handleComplete}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.NAVY} />
          ) : (
            <Text style={styles.primaryButtonText}>تم التوصيل بنجاح</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          activeOpacity={0.6}
          onPress={handleBack}
          disabled={isLoading}
        >
          <ChevronLeft size={20} color={COLORS.NAVY} style={{ marginRight: 5 }} />
          <Text style={styles.secondaryButtonText}>رجوع للتفاصيل</Text>
        </TouchableOpacity>
      </View>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.NAVY,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  visualContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.WHITE,
    borderRadius: 15,
  },
  arrivalStatus: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.NAVY,
    opacity: 0.8,
  },
  summaryCard: {
    backgroundColor: COLORS.WHITE,
    width: '100%',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: COLORS.NAVY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.NAVY,
    marginRight: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.DIVIDER,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.NAVY,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.YELLOW,
    textShadowColor: 'rgba(255, 204, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  confirmationText: {
    marginTop: 20,
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 25,
    paddingBottom: 30,
    gap: 15,
  },
  primaryButton: {
    backgroundColor: COLORS.YELLOW,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.NAVY,
  },
  secondaryButton: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: COLORS.NAVY,
    fontWeight: '600',
  },
});
