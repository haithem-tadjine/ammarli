import ScreenContainer from '../../components/ScreenContainer';
import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView,
  Switch, Dimensions, Image, Alert, Platform, StatusBar,
  TextInput, KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCustomerStore, Order } from '../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const NAVY = '#012047';
const YELLOW = '#F3CD0D';
const WHITE = '#FFFFFF';
const BG = '#F8FAFC';

const ScheduleOrderScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const draftOrder = useCustomerStore((s) => s.draftOrder);
  const userLocation = useCustomerStore((s) => s.userLocation);
  const scheduleOrder = useCustomerStore((s) => s.scheduleOrder);
  const addNotification = useCustomerStore((s) => s.addNotification);

  const { orderTitle, isTanker } = useLocalSearchParams();

  const actualTitle = orderTitle ? String(orderTitle) : (draftOrder.tankerDetails ? `صهريج مياه ${draftOrder.tankerDetails.quantity} لتر` : "طلب مياه");
  const actualIsTanker = isTanker === "true" || (!orderTitle && !!draftOrder.tankerDetails);

  const currentLocation = userLocation?.address || "حدد موقع التوصيل";

  const [date, setDate] = useState("17 أفريل 2026");
  const [time, setTime] = useState("08:00 ص");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleEditLocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(customer)/location-picker');
  };

  const handleConfirmSchedule = async () => {
    const fakeOrder: Order = {
      id: '',
      type: actualIsTanker ? 'Tanker' : 'Bottled',
      status: 'pending',
      quantity: draftOrder.tankerDetails?.quantity?.toString() || '1',
      price: 2500,
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

    addNotification({
      title: 'تم حفظ وجدولة طلبك',
      description: `تم جدولة طلبك بنجاح لتاريخ ${date} في تمام الساعة ${time}.`,
      type: 'schedule'
    });

    setShowToast(true);
    
    setTimeout(() => {
      setShowToast(false);
      router.push('/(customer)/(tabs)/activities');
    }, 2000);
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      
      {/* Header */}
      <View style={styles.header}>
        {/* Using row-reverse, right element first */}
        <View style={{ width: 40 }} /> 
        <Text style={styles.headerTitle}>جدولة الطلب</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={28} color={NAVY} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Order Summary Card */}
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.iconBoxWrap}>
                 <MaterialCommunityIcons name="text-box-check-outline" size={24} color={NAVY} />
              </View>
              <Text style={styles.cardTitle}>ملخص الطلب</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardBottom}>
              <Text style={styles.orderTitle} numberOfLines={1}>{actualTitle}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>قيد الجدولة</Text>
              </View>
            </View>
          </View>

          {/* Time & Date */}
          <Text style={styles.sectionTitle}>موعد التوصيل</Text>
          <View style={styles.dateTimeRow}>
            {/* Using row-reverse inside elements for RTL rendering */}
            <View style={styles.pickerBox}>
              <View style={styles.pickerIcon}>
                <Ionicons name="time-outline" size={20} color={NAVY} />
              </View>
              <TextInput 
                style={styles.pickerInput}
                value={time}
                onChangeText={setTime}
                placeholder="الوقت"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.pickerBox}>
              <View style={styles.pickerIcon}>
                <Ionicons name="calendar-outline" size={20} color={NAVY} />
              </View>
              <TextInput 
                style={styles.pickerInput}
                value={date}
                onChangeText={setDate}
                placeholder="التاريخ"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Location */}
          <Text style={styles.sectionTitle}>موقع التوصيل</Text>
          <TouchableOpacity style={styles.mapBox} onPress={handleEditLocation} activeOpacity={0.9}>
            <Image source={{ uri: 'https://api.mapbox.com/styles/v1/mapbox/light-v10/static/6.1748,35.5557,14,0/600x300?access_token=YOUR_MAPBOX_TOKEN' }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <View style={styles.mapGradient} />
            <View style={styles.locBubbleWrap}>
              <View style={styles.locBubble}>
                <Text style={styles.locText} numberOfLines={1}>{currentLocation}</Text>
                <Ionicons name="location" size={20} color={YELLOW} />
              </View>
              <View style={styles.changeLocBtn}>
                 <Text style={styles.changeLocText}>تغيير الموقع</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Options */}
          <Text style={styles.sectionTitle}>إعدادات إضافية</Text>
          <View style={styles.optionsCard}>
            <View style={styles.optionRow}>
              <Switch 
                value={isFavorite} 
                onValueChange={setIsFavorite}
                trackColor={{ false: "#E2E8F0", true: NAVY }}
                thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
              />
              <View style={styles.optionRight}>
                <Text style={styles.optionText}>إضافة للمفضلة</Text>
                <View style={styles.optionIcon}>
                  <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={20} color={isFavorite ? '#EF4444' : NAVY} />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.optionRow}>
              <Switch 
                value={isDraft} 
                onValueChange={setIsDraft}
                trackColor={{ false: "#E2E8F0", true: NAVY }}
                thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
              />
              <View style={styles.optionRight}>
                <Text style={styles.optionText}>حفظ كمسودة فقط</Text>
                <View style={styles.optionIcon}>
                  <Ionicons name={isDraft ? "document-text" : "document-text-outline"} size={20} color={NAVY} />
                </View>
              </View>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity 
          style={styles.confirmBtn} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            handleConfirmSchedule();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>تأكيد الجدولة</Text>
          <Ionicons name="checkmark-circle-outline" size={24} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* Toast */}
      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>تمت جدولة الطلب بنجاح!</Text>
          <Ionicons name="checkmark-circle" size={24} color={WHITE} />
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  
  header: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 60, backgroundColor: BG,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Bold', color: NAVY },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: WHITE, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  
  scrollContent: { padding: 20 },
  
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: '#475569', textAlign: 'right', marginBottom: 12, marginTop: 10 },
  
  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 20, padding: 18, marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3,
  },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  iconBoxWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  cardBottom: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  orderTitle: { fontSize: 15, fontFamily: 'Cairo-Bold', color: '#334155', flex: 1, textAlign: 'right', marginRight: 10 },
  statusPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#D97706' },

  // Date / Time
  dateTimeRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 25, gap: 12 },
  pickerBox: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 16, height: 56,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2,
  },
  pickerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  pickerInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo-Bold', color: NAVY, textAlign: 'right', marginRight: 10 },

  // Map
  mapBox: {
    height: 160, borderRadius: 20, overflow: 'hidden', marginBottom: 25,
    backgroundColor: '#E2E8F0', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10,
  },
  mapGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(1,32,71,0.2)' },
  locBubbleWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 10 },
  locBubble: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: WHITE,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, maxWidth: '85%',
  },
  locText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: NAVY, marginRight: 8 },
  changeLocBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  changeLocText: { color: WHITE, fontSize: 12, fontFamily: 'Cairo-Bold' },

  // Options
  optionsCard: {
    backgroundColor: WHITE, borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3,
  },
  optionRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  optionRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  optionText: { fontSize: 15, fontFamily: 'Cairo-Bold', color: NAVY },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE, paddingTop: 16, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 15,
  },
  confirmBtn: {
    height: 58, backgroundColor: YELLOW, borderRadius: 20,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: YELLOW, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  confirmBtnText: { fontSize: 18, fontFamily: 'Cairo-Bold', color: NAVY },

  // Toast
  toast: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    backgroundColor: '#10B981', flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  toastText: { color: WHITE, fontSize: 15, fontFamily: 'Cairo-Bold' },
});

export default ScheduleOrderScreen;
