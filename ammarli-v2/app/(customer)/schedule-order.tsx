import ScreenContainer from '../../components/ScreenContainer';
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
  Image,
  Alert,
  Platform,
  StatusBar,
  I18nManager,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  Heart, 
  FileText, 
  MapPin, 
  CheckCircle2, 
  ShoppingBag 
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCustomerStore, Order, ScheduledOrder } from '../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const THEME_NAVY = '#012047';
const THEME_YELLOW = '#FFCC00';

// تفعيل اتجاه اليمين لليسار
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const ScheduleOrderScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // استلام البيانات من الحالة العامة للتطبيق
  const draftOrder = useCustomerStore((s) => s.draftOrder);
  const userLocation = useCustomerStore((s) => s.userLocation);
  const scheduleOrder = useCustomerStore((s) => s.scheduleOrder);
  const acceptScheduledOrder = useCustomerStore((s) => s.acceptScheduledOrder);
  const addNotification = useCustomerStore((s) => s.addNotification);
  const addToFavorites = useCustomerStore((s) => s.addToFavorites);

  const { orderTitle, isTanker } = useLocalSearchParams();

  // ملخص الطلبية ديناميكياً
  const actualTitle = orderTitle ? String(orderTitle) : (draftOrder.tankerDetails ? `صهريج مياه ${draftOrder.tankerDetails.quantity} لتر` : "ماء جوديلا 0.5 لتر x30");
  const actualIsTanker = isTanker === "true" || (!orderTitle && !!draftOrder.tankerDetails);

  const orderSummary = {
    title: actualTitle,
    status: "تم التأكيد",
    id: `ORD-${Math.floor(Math.random() * 10000)}`
  };

  // الموقع المحفوظ مسبقاً
  const currentLocation = userLocation?.address || "بوزوران، طريق بسكرة، باتنة";

  const [date, setDate] = useState("17 أفريل 2026");
  const [time, setTime] = useState("08:12 م");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // وظيفة لتعديل الموقع (تأخذك لصفحة الخريطة)
  const handleEditLocation = () => {
    router.push('/(customer)/location-picker');
  };

  const handleConfirmSchedule = async () => {
    const fakeOrder: Order = {
      id: '',
      type: actualIsTanker ? 'Tanker' : 'Bottled',
      status: 'pending',
      quantity: draftOrder.tankerDetails?.quantity?.toString() || '1',
      price: 2500, // Mock price for now
      locationName: currentLocation,
      location: userLocation || { latitude: 0, longitude: 0 },
      waterType: (draftOrder.tankerDetails as any)?.waterType || 'spring_water',
      items: draftOrder.bottledWaterCart ? (Object.values(draftOrder.bottledWaterCart) as any[]) : []
    };

    try {
      await scheduleOrder(fakeOrder, date, time);
    } catch (e) {
      console.log('Error scheduling order', e);
    }

    // إضافة إشعار
    addNotification({
      title: 'تم حفظ وجدولة طلبك',
      description: `تم جدولة طلبك بنجاح لتاريخ ${date} في تمام الساعة ${time}.`,
      type: 'schedule'
    });

    // إظهار رسالة النجاح في الأسفل
    setShowToast(true);
    
    // الانتظار قليلاً ثم العودة لصفحة النشاطات مباشرة
    setTimeout(() => {
      setShowToast(false);
      router.push('/(customer)/(tabs)/activities');
    }, 2000);
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <View style={styles.safeArea}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft color={THEME_NAVY} size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>حفظ الطلب</Text>
          <View style={{ width: 28 }} />
        </View>

        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* بطاقة ملخص الطلبية الديناميكية */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{orderSummary.status}</Text>
                <CheckCircle2 size={14} color="#34C759" />
              </View>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>ملخص الطلب</Text>
                <View style={styles.iconBox}><ShoppingBag size={20} color={THEME_NAVY} /></View>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.orderDetailsRow}>
              <TouchableOpacity>
                <Text style={styles.editActionText}>تعديل الأصناف</Text>
              </TouchableOpacity>
              <Text style={styles.orderText} numberOfLines={1}>{orderSummary.title}</Text>
            </View>
          </View>

          {/* قسم جدولة التوصيل التفاعلي */}
          <Text style={styles.sectionLabel}>جدولة التوصيل</Text>
          <View style={styles.pickerRow}>
            <View style={styles.pickerField}>
              <Clock size={20} color={THEME_NAVY} />
              <TextInput 
                style={styles.pickerInput}
                value={time}
                onChangeText={setTime}
                placeholder="08:12 م"
                placeholderTextColor="#8E8E93"
              />
            </View>

            <View style={styles.pickerField}>
              <Calendar size={20} color={THEME_NAVY} />
              <TextInput 
                style={styles.pickerInput}
                value={date}
                onChangeText={setDate}
                placeholder="17 أفريل 2026"
                placeholderTextColor="#8E8E93"
              />
            </View>
          </View>

          {/* مفاتيح التبديل (Toggles) */}
          <View style={styles.optionsListCard}>
            <View style={styles.optionRow}>
              <Switch 
                value={isFavorite} 
                onValueChange={setIsFavorite}
                trackColor={{ false: "#D1D1D6", true: THEME_NAVY }}
                thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
              />
              <View style={styles.optionInfo}>
                <Text style={styles.optionText}>إضافة للمفضلة</Text>
                <View style={styles.miniIconBg}>
                  <Heart size={18} color={THEME_NAVY} fill={isFavorite ? THEME_NAVY : 'none'} />
                </View>
              </View>
            </View>

            <View style={[styles.divider, { marginVertical: 5 }, { paddingTop: insets.top, paddingBottom: insets.bottom }]} />

            <View style={styles.optionRow}>
              <Switch 
                value={isDraft} 
                onValueChange={setIsDraft}
                trackColor={{ false: "#D1D1D6", true: THEME_NAVY }}
                thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
              />
              <View style={styles.optionInfo}>
                <Text style={styles.optionText}>حفظ كمسودة</Text>
                <View style={styles.miniIconBg}><FileText size={18} color={THEME_NAVY} /></View>
              </View>
            </View>
          </View>

          {/* موقع التوصيل (ديناميكي وقابل للتعديل) */}
          <Text style={styles.sectionLabel}>موقع التوصيل</Text>
          <TouchableOpacity style={styles.mapContainer} onPress={handleEditLocation} activeOpacity={0.9}>
            <Image 
              source={{ uri: 'https://api.mapbox.com/styles/v1/mapbox/light-v10/static/6.1748,35.5557,14,0/600x300?access_token=YOUR_MAPBOX_TOKEN' }} 
              style={styles.mapPreview}
            />
            <View style={styles.locationOverlay}>
              <View style={styles.locationBubble}>
                <Text style={styles.locationText}>{currentLocation}</Text>
                <MapPin size={18} color="#FF3B30" />
              </View>
              <Text style={styles.mapHint}>انقر لتغيير الموقع</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer: زر التأكيد النهائي */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity 
            style={styles.confirmButton} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              handleConfirmSchedule();
            }}
            activeOpacity={0.8}
          >
            <Clock size={22} color={THEME_NAVY} strokeWidth={2.5} style={{ marginLeft: 10 }} />
            <Text style={styles.confirmButtonText}>تأكيد الجدولة</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* رسالة نجاح الجدولة (Toast) */}
      {showToast && (
        <View style={styles.toastContainer}>
          <CheckCircle2 size={24} color="#FFF" style={{ marginRight: 10 }} />
          <Text style={styles.toastText}>تمت عملية الجدولة بنجاح</Text>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 60, backgroundColor: '#FFF', elevation: 2,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Cairo-Bold', color: THEME_NAVY },
  backBtn: { padding: 5 },
  scrollContent: { padding: 20 },
  sectionCard: {
    backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 30,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12,
  },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitleRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontFamily: 'Cairo-Bold', marginLeft: 10, color: THEME_NAVY },
  iconBox: { backgroundColor: '#F2F2F7', padding: 8, borderRadius: 12 },
  statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#E8F9EE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusText: { color: '#34C759', fontSize: 12, fontFamily: 'Cairo-Bold', marginLeft: 6 },
  divider: { height: 1, backgroundColor: '#F2F2F7' },
  orderDetailsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  orderText: { flex: 1, textAlign: 'left', fontSize: 15, color: THEME_NAVY, fontFamily: 'Cairo-SemiBold', marginRight: 15 },
  editActionText: { color: THEME_YELLOW, fontFamily: 'Cairo-Bold', fontSize: 14 },
  sectionLabel: { fontSize: 18, fontFamily: 'Cairo-Bold', color: THEME_NAVY, textAlign: 'left', marginBottom: 15 },
  pickerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 30 },
  pickerField: {
    backgroundColor: '#FFF', width: '48%', height: 60, borderRadius: 16,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: THEME_NAVY, elevation: 2, paddingHorizontal: 10
  },
  pickerInput: { marginRight: 12, fontSize: 15, fontFamily: 'Cairo-Bold', color: THEME_NAVY, flex: 1, textAlign: 'left' },
  optionsListCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 15, marginBottom: 30, elevation: 3 },
  optionRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  optionInfo: { flexDirection: 'row-reverse', alignItems: 'center' },
  optionText: { fontSize: 16, fontFamily: 'Cairo-SemiBold', color: THEME_NAVY, marginLeft: 15 },
  miniIconBg: { backgroundColor: '#F2F2F7', padding: 8, borderRadius: 10 },
  mapContainer: { height: 190, borderRadius: 28, overflow: 'hidden', marginBottom: 20, elevation: 5 },
  mapPreview: { ...StyleSheet.absoluteFillObject },
  locationOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  locationBubble: {
    flexDirection: 'row-reverse', backgroundColor: '#FFF', paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 22, alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8
  },
  locationText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: THEME_NAVY, marginLeft: 10 },
  mapHint: { position: 'absolute', bottom: 12, color: '#FFF', fontSize: 12, fontFamily: 'Cairo-Bold' },
  footer: { padding: 25, backgroundColor: '#FFF', borderTopRightRadius: 30, borderTopLeftRadius: 30, elevation: 20 },
  confirmButton: {
    backgroundColor: THEME_YELLOW, height: 65, borderRadius: 32.5,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: THEME_YELLOW, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15
  },
  confirmButtonText: { fontSize: 20, fontFamily: 'Cairo-Bold', color: THEME_NAVY },
  toastContainer: {
    position: 'absolute',
    bottom: 90, // فوق زر التأكيد
    right: 20,
    left: 20,
    backgroundColor: '#34C759', // لون أخضر للنجاح
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  toastText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
  }
});

export default ScheduleOrderScreen;
