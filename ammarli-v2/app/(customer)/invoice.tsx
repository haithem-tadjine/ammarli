import ScreenContainer from '../../components/ScreenContainer';
import React, { useEffect } from 'react';
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
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCustomerStore } from '../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#012047',
  secondary: '#F3CD0D',
  white: '#FFFFFF',
  background: '#F4F7FA',
  textSecondary: '#64748B',
  success: '#10B981',
  border: '#E2E8F0',
};

export default function InvoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeOrder = useCustomerStore(state => state.activeOrder);
  const cancelOrder = useCustomerStore(state => state.cancelOrder);

  const isTanker = activeOrder?.type === 'Tanker';
  const items = activeOrder?.items && activeOrder.items.length > 0 ? activeOrder.items : [];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

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

  const calculatedItemsTotal = items.reduce((acc, item) => acc + (item.qty * (item.unitPrice || 0)), 0);
  const subtotal = isTanker 
    ? (activeOrder?.price || 0) 
    : (calculatedItemsTotal > 0 ? calculatedItemsTotal : (activeOrder?.price || 0));

  const totalAmount = subtotal + deliveryFee;

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Keep order info available for rating, but clear it after rating is done
    router.replace('/(customer)/driver-rating');
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 30 }]} showsVerticalScrollIndicator={false}>
        
        {/* Header: Success Icon and Message */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-sharp" color={COLORS.white} size={48} />
          </View>
          <Text style={styles.successTitle}>تم إكمال الطلب بنجاح</Text>
          <Text style={styles.invoiceInfo}>{invoiceNumber} • {currentDate}</Text>
        </View>

        {/* ── Invoice Card ───────────────────────────────────────────────────── */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
             <Text style={styles.receiptTitle}>تفاصيل الفاتورة</Text>
             <Feather name="file-text" size={20} color={COLORS.textSecondary} />
          </View>

          {/* Table Details */}
          {!isTanker ? (
            <>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { flex: 1.2 }]}>المجموع</Text>
                <Text style={[styles.columnHeader, { flex: 0.5 }]}>الكمية</Text>
                <Text style={[styles.columnHeader, { flex: 1 }]}>الحجم</Text>
                <Text style={[styles.columnHeader, { flex: 2, textAlign: 'right' }]}>العلامة / الصنف</Text>
              </View>

              {/* Table Rows */}
              <View style={{ maxHeight: 220 }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                  {items.map((item, index) => {
                    const itemTotal = item.qty * (item.unitPrice || 0);
                    return (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.rowText, styles.boldText, { flex: 1.2 }]}>
                          {itemTotal > 0 ? `${itemTotal.toFixed(0)} د.ج` : '-'}
                        </Text>
                        <Text style={[styles.rowText, { flex: 0.5 }]}>{item.qty}x</Text>
                        <Text style={[styles.rowText, { flex: 1 }]}>{item.size}</Text>
                        <Text style={[styles.rowText, styles.brandText, { flex: 2, textAlign: 'right' }]}>{item.brand || 'قوارير'}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          ) : (
            <>
              {/* Tanker Details Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { flex: 1.5 }]}>السعر</Text>
                <Text style={[styles.columnHeader, { flex: 1 }]}>الحجم</Text>
                <Text style={[styles.columnHeader, { flex: 2, textAlign: 'right' }]}>نوع المياه</Text>
              </View>
              {/* Tanker Details Row */}
              <View style={styles.tableRow}>
                <Text style={[styles.rowText, styles.boldText, { flex: 1.5 }]}>{subtotal.toLocaleString()} د.ج</Text>
                <Text style={[styles.rowText, { flex: 1 }]}>{activeOrder?.displayVolume || 'غير محدد'}</Text>
                <Text style={[styles.rowText, styles.brandText, { flex: 2, textAlign: 'right' }]}>{getWaterTypeLabel(activeOrder?.waterType)}</Text>
              </View>
            </>
          )}

          {/* Divider */}
          <View style={styles.dashedDivider}>
             {/* Creating dashed effect with repeated view is complex in RN, using solid but subtle border for now */}
          </View>

          {/* Summary Section */}
          <View style={styles.summarySection}>
             <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>{subtotal.toLocaleString()} د.ج</Text>
                <Text style={styles.summaryLabel}>المجموع الفرعي:</Text>
             </View>
             <View style={styles.summaryRow}>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>مجاناً</Text>
                <Text style={styles.summaryLabel}>رسوم التوصيل:</Text>
             </View>
          </View>

          {/* Total Box */}
          <View style={styles.totalBox}>
            <View>
              <Text style={styles.totalAmount}>{totalAmount.toLocaleString()} د.ج</Text>
              <Text style={styles.totalSub}>تم الدفع نقداً</Text>
            </View>
            <Text style={styles.totalTitle}>الإجمالي</Text>
          </View>
          
          <Text style={styles.deliveryNote}>توصيل بواسطة: <Text style={{ fontFamily: 'Cairo-Bold' }}>{driverName}</Text></Text>
        </View>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>الاستمرار للتقييم</Text>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <Text style={styles.footerBrand}>عمّارلي برو • مياه نقية بتوصيل سريع</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 16, alignItems: 'center', paddingBottom: 40 },
  
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  successTitle: { fontSize: 26, fontFamily: 'Cairo-Black', color: COLORS.primary, marginBottom: 4 },
  invoiceInfo: { fontSize: 14, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold' },
  
  receiptCard: {
    backgroundColor: COLORS.white, width: '100%', borderRadius: 24, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
  },
  receiptHeader: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  receiptTitle: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary },

  tableHeader: {
    flexDirection: 'row-reverse', borderBottomWidth: 1, borderBottomColor: COLORS.border, 
    paddingBottom: 12, marginBottom: 12,
  },
  columnHeader: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'Cairo-Bold', textAlign: 'center' },
  
  tableRow: {
    flexDirection: 'row-reverse', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9', alignItems: 'center'
  },
  rowText: { fontSize: 14, color: COLORS.primary, textAlign: 'center', fontFamily: 'Cairo-SemiBold' },
  boldText: { fontFamily: 'Cairo-Bold' },
  brandText: { fontFamily: 'Cairo-Bold', color: COLORS.primary },
  
  dashedDivider: {
    width: '100%', height: 1, backgroundColor: COLORS.border,
    marginVertical: 20,
  },

  summarySection: { paddingHorizontal: 4, marginBottom: 20 },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 15, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold' },
  summaryValue: { fontSize: 15, color: COLORS.primary, fontFamily: 'Cairo-Bold' },

  totalBox: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 20,
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  totalTitle: { color: COLORS.white, fontSize: 18, fontFamily: 'Cairo-Bold' },
  totalAmount: { color: COLORS.secondary, fontSize: 24, fontFamily: 'Cairo-Black' },
  totalSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Cairo-SemiBold', textAlign: 'left' },
  
  deliveryNote: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14, fontFamily: 'Cairo-SemiBold' },

  primaryBtn: {
    backgroundColor: COLORS.secondary,
    width: '100%', height: 60, borderRadius: 16,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  
  footerBrand: { fontSize: 13, color: '#94A3B8', fontFamily: 'Cairo-Bold', letterSpacing: 0.5 }
});
