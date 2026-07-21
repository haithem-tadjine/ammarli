import ScreenContainer from '../../components/ScreenContainer';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  Linking,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDriverStore } from '../../src/store/useDriverStore';

const COLORS = {
  primary:       '#002147',
  secondary:     '#F3CD0D',
  background:    '#F2F4F7',
  white:         '#FFFFFF',
  textSecondary: '#8E8E93',
  danger:        '#EF4444',
  success:       '#22C55E',
};

// ─── أيقونة لكل نوع طلبية ─────────────────────────────────────────────────────
const ORDER_META: Record<string, { icon: string; color: string; bg: string }> = {
  bottles:            { icon: 'bottle-wine-outline', color: '#16A34A', bg: '#F0FDF4' },
  well_water:         { icon: 'water-well-outline',  color: '#2563EB', bg: '#EFF6FF' },
  construction_water: { icon: 'dump-truck',          color: '#D97706', bg: '#FFF7ED' },
  spring_water:       { icon: 'water',               color: '#2563EB', bg: '#EFF6FF' },
};

export default function OrderAcceptanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const updateDriverOrderStatus = useDriverStore(s => s.updateDriverOrderStatus);

  const params = useLocalSearchParams<{ orderId: string; avatarUrl?: string }>();
  
  const activeDriverOrder = useDriverStore(s => s.activeDriverOrder);
  const registeredDriver = useDriverStore(s => s.registeredDriver);
  
  const order = activeDriverOrder;

  const customerName = order?.customer.name ?? 'الزبون';
  const customerPhone = order?.customer.phone ?? '';
  const customerLat = String(order?.deliveryAddress.lat ?? '');
  const customerLng = String(order?.deliveryAddress.lng ?? '');
  const price        = Number(order?.total ?? 2500);
  const address      = order?.deliveryAddress.label  ?? 'الجزائر العاصمة';
  
  const orderType = registeredDriver?.driverType === 'Bottled' ? 'bottles' 
    : (registeredDriver?.waterType === 'well' ? 'well_water' 
    : (registeredDriver?.waterType === 'construction' ? 'construction_water' 
    : 'spring_water'));
    
  const meta         = ORDER_META[orderType] ?? ORDER_META.spring_water;
  const capacityLiters = Number(order?.items?.[0]?.qty || 1000);
  const floor = String(order?.items?.[0]?.floor || 'غير محدد');
  const [bucketPrice, setBucketPrice] = useState('');
  const [wellWaterPrice, setWellWaterPrice] = useState('');
  
  const [bottleItems, setBottleItems] = useState<{id: number, name: string, qty: number, unit: string, price: string, image: string}[]>(() => {
    return order?.items?.map((i, idx) => ({
      id: idx,
      name: i.description,
      qty: i.qty || 1,
      unit: i.detail,
      price: String(i.unitPrice || i.price || 0),
      image: i.icon
    })) || [];
  });

  const [totalPrice, setTotalPrice] = useState(orderType === 'spring_water' ? 0 : price);
  const [confirmed, setConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const BUCKET_CAPACITY = 20;

  useEffect(() => {
    if (confirmed) return;
    if (timeLeft <= 0) {
      Alert.alert('انتهى الوقت', 'لقد انتهى وقت تحديد السعر، تمت العودة للرئيسية.');
      router.replace('/(driver)/(tabs)' as any);
      return;
    }
    const timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft, confirmed]);

  const handlePriceChange = (id: number, text: string) => {
    setBottleItems(prev => prev.map(item => item.id === id ? { ...item, price: text } : item));
  };

  // ── العملية الحسابية ──
  useEffect(() => {
    if (orderType === 'spring_water') {
      const p = parseFloat(bucketPrice);
      setTotalPrice(!isNaN(p) && p >= 0 ? (capacityLiters / BUCKET_CAPACITY) * p : 0);
    } else if (orderType === 'well_water' || orderType === 'construction_water') {
      const p = parseFloat(wellWaterPrice);
      setTotalPrice(!isNaN(p) && p >= 0 ? p : 0);
    } else if (orderType === 'bottles') {
      const total = bottleItems.reduce((sum, item) => sum + (item.qty * (parseFloat(item.price) || 0)), 0);
      setTotalPrice(total);
    }
  }, [bucketPrice, wellWaterPrice, bottleItems, capacityLiters, orderType]);

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (customerPhone) {
      Linking.openURL(`tel:${customerPhone}`);
    } else {
      Alert.alert('خطأ', 'رقم الهاتف غير متوفر');
    }
  };



  const handleConfirm = () => {
    if (totalPrice <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال السعر لتأكيد الاستلام');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setConfirmed(true);
    updateDriverOrderStatus('driving', totalPrice);
    setTimeout(() => {
      router.replace({
        pathname: '/(driver)/order-details' as any,
        params: {
          customerName: customerName,
          customerPhone: customerPhone,
          customerLat: customerLat,
          customerLng: customerLng,
          price:        String(totalPrice), // Pass the calculated total price
          address:      address,
          orderType:    orderType,
          distance:     order?.deliveryAddress.distance ?? '2.5 كم',
          rating:       (order?.customer as any)?.rating ?? '4.8',
          orderNumber:  activeDriverOrder?.orderId ? activeDriverOrder.orderId.split('-')[0].toUpperCase() : String(Math.floor(10000 + Math.random() * 90000)),
        },
      });
    }, 1200);
  };

  const handleReject = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (activeDriverOrder?.orderId) {
      try {
        await useDriverStore.getState().rejectDriverOrder(activeDriverOrder.orderId);
      } catch (e) {
        console.error('Failed to reject order', e);
      }
    }
    
    router.replace('/(driver)/(tabs)' as any);
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F4F7" />

      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollArea, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">

          {/* ── مؤقت العد التنازلي ── */}
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={24} color={timeLeft <= 10 ? COLORS.danger : COLORS.primary} />
            <Text style={[styles.timerText, { color: timeLeft <= 10 ? COLORS.danger : COLORS.primary }]}>
              {timeLeft} ثانية متبقية لتأكيد السعر
            </Text>
          </View>

          {/* ── بطاقة العميل ── */}
          <View style={styles.customerCard}>
              {params.avatarUrl ? (
                <Image 
                  source={{uri: params.avatarUrl as string}} 
                  style={styles.avatarImage} 
                />
              ) : (
                <View style={[styles.avatarImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={24} color="#64748B" />
                </View>
              )}
            <View style={styles.customerInfo}>
              <Text style={styles.statusLabel}>تم قبول طلب جديد</Text>
              <Text style={styles.customerName}>{customerName}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.locationText}>{order?.deliveryAddress.distance ?? '2.5 كم'} • {(order?.customer as any)?.rating ?? '4.8'} ⭐</Text>
              </View>
            </View>
            <View style={styles.shieldIconBox}>
               <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
            </View>
          </View>

          {/* ── تفاصيل الطلبية ── */}
          <View style={styles.detailsContainer}>
            
            {/* العنوان (رقم الطلب والتفاصيل) */}
            <View style={styles.detailsHeader}>
              <View style={styles.titleRow}>
                <Ionicons name="document-text-outline" size={24} color={COLORS.primary} style={{marginLeft: 8}} />
                <Text style={styles.detailsTitle}>تفاصيل الطلبية</Text>
              </View>
              <View style={styles.orderBadge}>
                <Text style={styles.orderIdText}>طلب رقم #{activeDriverOrder?.orderId ? activeDriverOrder.orderId.split('-')[0].toUpperCase() : String(Math.floor(10000 + Math.random() * 90000))}</Text>
              </View>
            </View>

            {/* نوع المياه والسعر (لا يظهر للقوارير، لأنها قائمة مفصلة) */}
            {orderType !== 'bottles' && (
              <View style={styles.itemRow}>
                 <View style={styles.itemRowRight}>
                   <View style={[styles.itemIconBox, { backgroundColor: meta.bg }]}>
                      <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
                   </View>
                   <Text style={styles.itemTitle}>{getOrderLabel(orderType)}</Text>
                 </View>

              </View>
            )}

            {/* السعة */}
            {(orderType === 'spring_water' || orderType === 'well_water' || orderType === 'construction_water') && (
              <View style={styles.capacityRow}>
                <Text style={styles.capacityLabel}>السعة</Text>
                <Text style={styles.capacityValue}>{capacityLiters} لتر</Text>
              </View>
            )}

            {/* الطابق (يظهر فقط لآبار) */}
            {orderType === 'well_water' && (
              <View style={styles.capacityRow}>
                <Text style={styles.capacityLabel}>الطابق</Text>
                <Text style={styles.capacityValue}>{floor}</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* ── Dynamic Item List for Bottles ── */}
            {orderType === 'bottles' && bottleItems.map((item, index) => (
              <View key={item.id}>
                <View style={styles.itemRowBottles}>
                  <View style={[styles.imageBoxBottles, { backgroundColor: '#F0FDF4' }]}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.productImageBottles} resizeMode="contain" />
                    ) : (
                      <MaterialCommunityIcons name="bottle-wine-outline" size={40} color="#16A34A" />
                    )}
                  </View>
                  <View style={styles.itemDetailsBottles}>
                    <Text style={styles.itemNameBottles}>{item.name}</Text>
                    <Text style={styles.itemQtyBottles}>الكمية المطلوبة: {item.qty} {item.unit}</Text>
                    
                    <Text style={styles.priceLabelBottles}>سعر الوحدة</Text>
                    <View style={styles.priceInputContainerBottles}>
                      <TextInput
                        style={styles.priceInputBottles}
                        value={item.price}
                        onChangeText={(text) => handlePriceChange(item.id, text)}
                        keyboardType="numeric"
                        textAlign="right"
                      />
                      <Text style={styles.currencyLabelBottles}>د.ج</Text>
                    </View>
                  </View>
                </View>
                {index !== bottleItems.length - 1 && <View style={styles.divider} />}
              </View>
            ))}

            {/* ── قسم إدخال السعر (يظهر فقط لمياه الينابيع) ── */}
            {orderType === 'spring_water' && (
              <View style={styles.inputSection}>
                <View style={styles.inputTexts}>
                   <Text style={styles.inputLabel}>سعر الدلو (20 لتر)</Text>
                   <Text style={styles.inputHint}>أدخل سعر الوحدة</Text>
                </View>
                
                <View style={styles.inputWrapper}>
                   <TextInput
                     style={styles.priceInput}
                     placeholder="0"
                     placeholderTextColor="#ADB5BD"
                     keyboardType="numeric"
                     value={bucketPrice}
                     onChangeText={setBucketPrice}
                     textAlign="center"
                   />
                   <Text style={styles.currencySuffix}>د.ج</Text>
                </View>
              </View>
            )}

            {/* ── قسم إدخال السعر الإجمالي (يظهر لآبار فقط) ── */}
            {(orderType === 'well_water' || orderType === 'construction_water') && (
              <View style={styles.inputSection}>
                <View style={styles.inputTexts}>
                   <Text style={styles.inputLabel}>أدخل السعر الإجمالي</Text>
                   <Text style={styles.paymentMethod}>مدفوع عبر المحفظة</Text>
                </View>
                
                <View style={styles.inputWrapper}>
                   <TextInput
                     style={styles.priceInputWell}
                     placeholder="0"
                     placeholderTextColor="#ADB5BD"
                     keyboardType="numeric"
                     value={wellWaterPrice}
                     onChangeText={setWellWaterPrice}
                     textAlign="center"
                   />
                   <Text style={styles.currencySuffixWell}>د.ج</Text>
                </View>
              </View>
            )}

            {/* ── السعر الإجمالي ── */}
            {orderType !== 'well_water' && orderType !== 'construction_water' && (
              <View style={styles.totalRow}>
                 <View style={styles.totalTexts}>
                    <Text style={styles.totalLabel}>السعر الإجمالي</Text>
                    <Text style={styles.paymentMethod}>مدفوع عبر المحفظة</Text>
                 </View>
                 <Text style={styles.totalValue}>{totalPrice.toLocaleString('ar-DZ')} <Text style={styles.currencyLarge}>د.ج</Text></Text>
              </View>
            )}
          </View>

          {/* رسالة النجاح */}
          {confirmed && (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.success} />
              <Text style={styles.successText}>تم تأكيد الاستلام بنجاح!</Text>
            </View>
          )}

        </ScrollView>
        </KeyboardAvoidingView>

        {/* ── أزرار التحكم ── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 15 }]}>
          <TouchableOpacity 
            style={styles.confirmButton} 
            activeOpacity={0.8} 
            onPress={handleConfirm} 
            disabled={confirmed}
          >
            <Text style={styles.confirmButtonText}>تأكيد الاستلام</Text>
          </TouchableOpacity>

          {false && <TouchableOpacity style={styles.callButton} activeOpacity={0.8} onPress={handleCall}>
            <Ionicons name="call" size={20} color="#FFF" style={{marginLeft: 10}} />
            <Text style={styles.callButtonText}>اتصال بالعميل</Text>
          </TouchableOpacity>}

          <TouchableOpacity style={styles.cancelLink} onPress={handleReject}>
            <Text style={styles.cancelText}>رفض الطلب</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScreenContainer>
  );
}

// ─── مساعد: اسم نوع الطلبية بالعربية ────────────────────────────────────────
function getOrderLabel(type: string): string {
  switch (type) {
    case 'bottles':            return 'مياه معدنية معبأة';
    case 'well_water':         return 'صهريج مياه آبار';
    case 'construction_water': return 'صهريج مياه أشغال';
    default:                   return 'مياه ينابيع طبيعية';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  overlay: { flex: 1 },
  scrollArea: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 10 : 20 },
  
  timerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', paddingVertical: 10, borderRadius: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  timerText: { fontSize: 16, fontFamily: 'Cairo-Bold', marginLeft: 8 },
  
  customerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarImage: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: COLORS.secondary },
  customerInfo: { flex: 1, alignItems: 'flex-start', paddingHorizontal: 15 },
  shieldIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F6F9', justifyContent: 'center', alignItems: 'center' },
  statusLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontFamily: 'Cairo-SemiBold', textAlign: 'left' },
  customerName: { fontSize: 18, color: COLORS.primary, fontFamily: 'Cairo-Black', textAlign: 'left' },
  ratingRow: { marginTop: 4, alignItems: 'flex-start' },
  locationText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold', textAlign: 'left' },

  detailsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 25,
    padding: 20,
    marginBottom: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 15,
  },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  detailsTitle: { fontSize: 18, color: COLORS.primary, fontFamily: 'Cairo-Black' },
  orderBadge: { backgroundColor: '#F2F4F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  orderIdText: { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'Cairo-Bold' },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  itemRowRight: { flexDirection: 'row', alignItems: 'center' },
  itemIconBox: { width: 35, height: 35, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  itemTitle: { fontSize: 16, color: COLORS.primary, fontFamily: 'Cairo-Bold' },
  deliveryPrice: { fontSize: 15, color: COLORS.primary, fontFamily: 'Cairo-Bold' },
  
  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  capacityLabel: { fontSize: 15, color: COLORS.primary, fontFamily: 'Cairo-SemiBold' },
  capacityValue: { fontSize: 15, color: COLORS.primary, fontFamily: 'Cairo-SemiBold' },
  
  divider: { height: 1, borderWidth: 1, borderColor: '#E5E5EA', borderStyle: 'dashed', marginVertical: 20, borderRadius: 1 },
  
  inputSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  inputTexts: { alignItems: 'flex-start' },
  inputLabel: { fontSize: 16, color: COLORS.primary, fontFamily: 'Cairo-Bold', textAlign: 'left' },
  inputHint: { fontSize: 12, color: '#ADB5BD', marginTop: 2, fontFamily: 'Cairo-SemiBold', textAlign: 'left' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  currencySuffix: { marginRight: 10, fontSize: 16, color: COLORS.primary, fontFamily: 'Cairo-Bold' },
  priceInput: {
    backgroundColor: '#F8F9FB', width: 80, height: 45, borderRadius: 12, fontSize: 18,
    color: COLORS.primary, fontFamily: 'Cairo-Bold', borderWidth: 1, borderColor: '#E5E5EA', paddingHorizontal: 10,
  },
  priceInputWell: {
    backgroundColor: '#FFF', width: 100, height: 50, borderRadius: 15, fontSize: 22,
    color: COLORS.secondary, fontFamily: 'Cairo-Black', borderWidth: 1.5, borderColor: '#E5E5EA', paddingHorizontal: 10,
  },
  currencySuffixWell: { marginRight: 10, fontSize: 18, color: COLORS.secondary, fontFamily: 'Cairo-Black' },
  
  itemRowBottles: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  imageBoxBottles: { width: 80, height: 80, backgroundColor: '#F8F9FB', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  productImageBottles: { width: 60, height: 60 },
  itemDetailsBottles: { flex: 1, alignItems: 'flex-start' },
  itemNameBottles: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary },
  itemQtyBottles: { fontSize: 12, color: '#8E8E93', fontFamily: 'Cairo-SemiBold', marginTop: 2 },
  priceLabelBottles: { fontSize: 10, color: '#8E8E93', fontFamily: 'Cairo-Bold', marginTop: 8 },
  priceInputContainerBottles: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 10, height: 40, width: 140, marginTop: 4, backgroundColor: '#FFF' },
  priceInputBottles: { flex: 1, fontSize: 14, fontFamily: 'Cairo-Bold', color: '#000' },
  currencyLabelBottles: { fontSize: 12, color: COLORS.primary, fontFamily: 'Cairo-Black', marginRight: 5 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalTexts: { alignItems: 'flex-start' },
  totalLabel: { fontSize: 18, color: COLORS.primary, fontFamily: 'Cairo-Black', textAlign: 'left' },
  paymentMethod: { fontSize: 12, color: '#ADB5BD', fontFamily: 'Cairo-SemiBold', textAlign: 'left' },
  totalValue: { fontSize: 26, color: COLORS.secondary, fontFamily: 'Cairo-Black' },
  currencyLarge: { fontSize: 18 },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  successText: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.success },

  footer: { paddingHorizontal: 20, gap: 12 },
  confirmButton: {
    backgroundColor: COLORS.secondary, height: 60, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', marginBottom: 5,
    elevation: 3, shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10,
  },
  confirmButtonText: { color: COLORS.primary, fontSize: 18, fontFamily: 'Cairo-Black' },
  callButton: {
    backgroundColor: COLORS.primary, height: 60, borderRadius: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 5,
  },
  callButtonText: { color: '#FFF', fontSize: 18, fontFamily: 'Cairo-Bold' },
  cancelLink: { alignSelf: 'center', padding: 10 },
  cancelText: { color: '#ADB5BD', fontSize: 15, fontFamily: 'Cairo-SemiBold' }
});
