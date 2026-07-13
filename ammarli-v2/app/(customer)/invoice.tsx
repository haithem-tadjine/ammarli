import ScreenContainer from '../../components/ScreenContainer';
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { Check, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCustomerStore } from '../../src/store/useCustomerStore';

const { width } = Dimensions.get('window');

const COLORS = {
  primaryBlue: '#002147',
  accentYellow: '#FFCC00',
  white: '#FFFFFF',
  textSecondary: '#8E8E93',
  background: '#F8F9FA',
};

export default function InvoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeOrder, cancelOrder } = useCustomerStore();

  const isTanker = activeOrder?.type === 'Tanker';
  const items = activeOrder?.items && activeOrder.items.length > 0 ? activeOrder.items : [];

  const getWaterTypeLabel = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'WELL': return 'مياه آبار';
      case 'SPRING': return 'مياه ينابيع';
      case 'CONSTRUCTION': return 'مياه أشغال';
      default: return 'صهريج مياه';
    }
  };

  const invoiceNumber = activeOrder ? `INV-${activeOrder.id.toString().substring(0, 6).toUpperCase()}` : `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const driverName = activeOrder?.driverInfo?.name || "السائق";
  const deliveryFee = 0;

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const currentTime = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const subtotal = isTanker 
    ? (activeOrder?.price || 0) 
    : items.reduce((acc, item) => acc + (item.qty * (item.unitPrice || 0)), 0);

  const totalAmount = subtotal + deliveryFee;

  const handleFinish = () => {
    // Keep order info available for rating, but clear it after rating is done
    router.replace('/(customer)/driver-rating');
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        
        {/* Header: Success Icon and Message */}
        <View style={styles.header}>
          <View style={styles.checkCircle}>
            <Check color={COLORS.white} size={40} strokeWidth={3} />
          </View>
          <Text style={styles.successTitle}>تم إكمال الطلب بنجاح</Text>
          <Text style={styles.invoiceInfo}>{invoiceNumber} • {currentDate} • {currentTime}</Text>
        </View>

        {/* Invoice Card */}
        <View style={styles.receiptCard}>
          {/* Table Details */}
          {!isTanker ? (
            <>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { flex: 1.2 }, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>المجموع الفرعي</Text>
                <Text style={[styles.columnHeader, { flex: 1 }]}>سعر الوحدة</Text>
                <Text style={[styles.columnHeader, { flex: 0.5 }]}>الكمية</Text>
                <Text style={[styles.columnHeader, { flex: 0.7 }]}>الحجم</Text>
                <Text style={[styles.columnHeader, { flex: 1.5 }]}>العلامة التجارية</Text>
              </View>

              {/* Table Rows - Scrollable for large orders */}
              <View style={{ maxHeight: 220 }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                  {items.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.rowText, { flex: 1.2 }]}>{(item.qty * (item.unitPrice || 0)).toFixed(2)} د.ج</Text>
                      <Text style={[styles.rowText, { flex: 1 }]}>{(item.unitPrice || 0).toFixed(2)} د.ج</Text>
                      <Text style={[styles.rowText, { flex: 0.5 }]}>{item.qty}</Text>
                      <Text style={[styles.rowText, { flex: 0.7 }]}>{item.size}</Text>
                      <Text style={[styles.rowText, { flex: 1.5, fontFamily: 'Cairo-Bold', color: COLORS.primaryBlue }]}>{item.brand}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </>
          ) : (
            <>
              {/* Tanker Details Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { flex: 1 }]}>السعر الإجمالي</Text>
                <Text style={[styles.columnHeader, { flex: 1 }]}>الكمية / الحجم</Text>
                <Text style={[styles.columnHeader, { flex: 1.5 }]}>نوع المياه</Text>
              </View>
              {/* Tanker Details Row */}
              <View style={styles.tableRow}>
                <Text style={[styles.rowText, { flex: 1 }]}>{subtotal.toLocaleString()} د.ج</Text>
                <Text style={[styles.rowText, { flex: 1 }]}>{activeOrder?.displayVolume || 'غير محدد'}</Text>
                <Text style={[styles.rowText, { flex: 1.5, fontFamily: 'Cairo-Bold', color: COLORS.primaryBlue }]}>{getWaterTypeLabel(activeOrder?.waterType)}</Text>
              </View>
            </>
          )}

          {/* Summary Section */}
          <View style={styles.summarySection}>
             <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>{subtotal.toLocaleString()} د.ج</Text>
                <Text style={styles.summaryLabel}>المجموع الفرعي:</Text>
             </View>
          </View>

          {/* Navy Total Card */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>إجمالي المبلغ المدفوع</Text>
            <Text style={styles.totalAmount}>{totalAmount.toLocaleString()} د.ج</Text>
            <Text style={styles.deliveryNote}>تم التوصيل بواسطة: {driverName}</Text>
          </View>
        </View>

        {/* Rating Button */}
        <TouchableOpacity style={styles.ratingButton} activeOpacity={0.8} onPress={handleFinish}>
          <Star color={COLORS.primaryBlue} size={22} fill={COLORS.primaryBlue} />
          <Text style={styles.ratingButtonText}>تقييم السائق</Text>
        </TouchableOpacity>

        <Text style={styles.footerBrand}>AMMARLI PREMIUM WATER • توصيل سريع ونقي</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accentYellow,
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    elevation: 8, shadowColor: COLORS.accentYellow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  successTitle: { fontSize: 28, fontFamily: 'Cairo-Bold', color: COLORS.primaryBlue, marginBottom: 6 },
  invoiceInfo: { fontSize: 15, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold' },
  
  receiptCard: {
    backgroundColor: COLORS.white, width: '100%', borderRadius: 24, padding: 15, marginBottom: 25,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12,
  },
  tableHeader: {
    flexDirection: 'row-reverse', borderBottomWidth: 1, borderBottomColor: '#F2F2F7', paddingBottom: 12, marginBottom: 10,
  },
  columnHeader: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'Cairo-Bold', textAlign: 'center' },
  tableRow: {
    flexDirection: 'row-reverse', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F2F2F7', alignItems: 'center'
  },
  rowText: { fontSize: 13, color: '#444', textAlign: 'center', fontFamily: 'Cairo-SemiBold' },
  
  summarySection: { marginTop: 20, paddingHorizontal: 5 },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginBottom: 8 },
  summaryLabel: { fontSize: 15, color: COLORS.primaryBlue, fontFamily: 'Cairo-SemiBold', width: 120, textAlign: 'left' },
  summaryValue: { fontSize: 15, color: COLORS.primaryBlue, fontFamily: 'Cairo-Bold', marginRight: 15 },

  totalCard: {
    backgroundColor: COLORS.primaryBlue, borderRadius: 20, padding: 25, marginTop: 25, alignItems: 'center',
    elevation: 5, shadowColor: COLORS.primaryBlue, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 8, fontFamily: 'Cairo-SemiBold' },
  totalAmount: { color: COLORS.white, fontSize: 34, fontFamily: 'Cairo-Bold', marginBottom: 12 },
  deliveryNote: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Cairo-SemiBold' },

  ratingButton: {
    backgroundColor: COLORS.accentYellow, width: '100%', height: 60, borderRadius: 30,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', marginBottom: 25,
    elevation: 6, shadowColor: COLORS.accentYellow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  ratingButtonText: { fontSize: 20, fontFamily: 'Cairo-Bold', color: COLORS.primaryBlue, marginLeft: 12 },
  footerBrand: { fontSize: 12, color: '#ADB5BD', fontFamily: 'Cairo-Bold', marginTop: 10, letterSpacing: 0.5 }
});
