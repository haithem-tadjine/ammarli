import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  Animated,
  Keyboard
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCustomerStore } from '../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';
import ScreenContainer, { MIN_BOTTOM_INSET } from '../../components/ScreenContainer';
import MapView, { Marker } from '../../components/Map';

const { width } = Dimensions.get('window');

const NAVY  = '#012047';
const YELLOW = '#F3CD0D';
const WHITE  = '#FFFFFF';
const BG     = '#F0F4F8';

// ── Config per water type ──────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { title: string; icon: string; color: string; bg: string; drinkable: boolean }> = {
  Spring: {
    title: 'مياه ينابيع',
    icon: 'water',
    color: '#0EA5E9',
    bg: '#E0F2FE',
    drinkable: true,
  },
  Well: {
    title: 'مياه آبار',
    icon: 'water-pump',
    color: '#7C3AED',
    bg: '#EDE9FE',
    drinkable: false,
  },
  Ashghal: {
    title: 'مياه أشغال',
    icon: 'dump-truck',
    color: '#EA580C',
    bg: '#FEF3C7',
    drinkable: false,
  },
};

const QUICK_QTYS = [1000, 2000, 3000, 5000, 10000];

export default function TankDeliveryDetailsScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();

  const cfg = TYPE_CONFIG[type as string] ?? TYPE_CONFIG['Spring'];
  const isSpring = type === 'Spring';
  const isWell = type === 'Well';
  const isAshghal = type === 'Ashghal';
  const MAX_QTY = isSpring ? 3000 : (isWell ? 6000 : (isAshghal ? 80000 : 20000));
  const MIN_QTY = isSpring ? 40 : (isWell ? 1500 : (isAshghal ? 6000 : 0));
  const STEP_QTY = isSpring ? 10 : (isWell ? 1500 : (isAshghal ? 2000 : 500));

  const [tankLocation, setTankLocation] = useState(isAshghal ? 'فلاحة' : 'أرضي');
  const [floor,        setFloor]        = useState(1);
  const [quantity,     setQuantity]     = useState(MIN_QTY);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  React.useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const shakeAnim = React.useRef(new Animated.Value(0)).current;
  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const createOrder  = useCustomerStore(s => s.createOrder);
  const userLocation = useCustomerStore(s => s.userLocation);
  const draftOrder   = useCustomerStore(s => s.draftOrder);

  const handleOrderNow = async () => {
    if (quantity < MIN_QTY) { triggerShake(); Alert.alert('تنبيه', `يرجى إدخال الكمية المطلوبة باللتر أولاً (الحد الأدنى ${MIN_QTY} لتر)`); return; }
    const selectedLocation = draftOrder.location;
    if (!selectedLocation) { triggerShake(); Alert.alert('تنبيه', 'يرجى تحديد موقع التوصيل أولاً'); return; }

    const orderData = {
      id: 'local-' + Math.floor(Math.random() * 100000),
      type: type as string,
      status: 'searching' as any,
      quantity: quantity.toString(),
      location: selectedLocation,
      locationName: selectedLocation.address || 'موقع التوصيل الحالي',
      items: [{
        brand: cfg.title,
        size: `${quantity} لتر`,
        qty: 1,
        floor: type !== 'Spring' ? floor : undefined,
      }]
    };
    useCustomerStore.setState({ activeOrder: orderData });
    router.push('/(customer)/searching-driver');
  };

  return (
    <ScreenContainer edges={['top']} backgroundColor={NAVY} statusBarStyle="light-content" statusBarColor={NAVY}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.push('/(customer)/(tabs)' as any)}
        >
          <Ionicons name="chevron-back" size={26} color={WHITE} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerIconWrap, { backgroundColor: cfg.color + '33' }]}>
            <MaterialCommunityIcons name={cfg.icon as any} size={22} color={WHITE} />
          </View>
          <Text style={styles.headerTitle}>{cfg.title}</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, backgroundColor: BG }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Map / Location ────────────────────────────────────────────── */}
          <Animated.View style={[styles.mapSection, { transform: [{ translateX: shakeAnim }] }]}>
            <TouchableOpacity
              style={styles.mapBox}
              activeOpacity={0.9}
              onPress={() => router.push('/(customer)/location-picker')}
            >
              {Platform.OS === 'web' ? (
                <Image
                  source={{ uri: 'https://placehold.co/600x200/EAECEE/002147?font=roboto&text=Map+Preview' }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
              ) : (
                <MapView
                  pointerEvents="none"
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude:  draftOrder.location?.latitude  || userLocation?.latitude  || 35.5557,
                    longitude: draftOrder.location?.longitude || userLocation?.longitude || 6.1748,
                    latitudeDelta: 0.01, longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker coordinate={{
                    latitude:  draftOrder.location?.latitude  || userLocation?.latitude  || 35.5557,
                    longitude: draftOrder.location?.longitude || userLocation?.longitude || 6.1748,
                  }} />
                </MapView>
              )}
              {/* Gradient overlay */}
              <View style={styles.mapGradient} pointerEvents="none" />
              {/* Pin */}
              <View style={styles.mapPin} pointerEvents="none">
                <Ionicons name="location" size={36} color={cfg.color} />
              </View>
            </TouchableOpacity>

            {/* Location Info Strip */}
            <View style={styles.locationStrip}>
              <View style={styles.locationStripLeft}>
                <View style={[styles.locationDot, { backgroundColor: cfg.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationLabel}>{draftOrder.location ? 'موقع التوصيل' : 'حدد موقع التوصيل'}</Text>
                  <Text style={styles.locationAddr} numberOfLines={1}>
                    {draftOrder.location?.address || 'اضغط على الخريطة لاختيار موقعك'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.changeLocBtn, { borderColor: cfg.color }]}
                onPress={() => router.push('/(customer)/location-picker')}
              >
                <Text style={[styles.changeLocText, { color: cfg.color }]}>تغيير</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Usage Area (Ashghal only) ────────────────────────────────── */}
          {type === 'Ashghal' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>مجال الاستخدام</Text>
              <View style={styles.locationGrid}>
                {[
                  { label: 'فلاحة', icon: 'leaf-outline',    key: 'فلاحة' },
                  { label: 'أشغال', icon: 'hammer-outline',  key: 'أشغال' },
                  { label: 'مسابح', icon: 'water-outline',   key: 'مسابح' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.locOpt, tankLocation === opt.key && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                    onPress={() => setTankLocation(opt.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={opt.icon as any} size={28} color={tankLocation === opt.key ? cfg.color : '#94A3B8'} />
                    <Text style={[styles.locOptLabel, tankLocation === opt.key && { color: cfg.color }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Tank Location (Well only) ────────────────────────────────── */}
          {type === 'Well' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>موقع الخزان</Text>
              <View style={styles.locationGrid}>
                {[
                  { label: 'سطح المبنى', icon: 'business-outline',  key: 'سطح' },
                  { label: 'تحت الأرض',  icon: 'layers-outline',    key: 'تحت' },
                  { label: 'أرضي',       icon: 'home-outline',       key: 'أرضي' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.locOpt, tankLocation === opt.key && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                    onPress={() => setTankLocation(opt.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={opt.icon as any} size={28} color={tankLocation === opt.key ? cfg.color : '#94A3B8'} />
                    <Text style={[styles.locOptLabel, tankLocation === opt.key && { color: cfg.color }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Floor picker */}
              {tankLocation === 'سطح' && (
                <View style={styles.floorRow}>
                  <Text style={styles.floorLabel}>رقم الطابق</Text>
                  <View style={styles.floorControl}>
                    <TouchableOpacity
                      style={[styles.floorBtn, floor <= 1 && { opacity: 0.35 }]}
                      onPress={() => setFloor(p => Math.max(1, p - 1))}
                      disabled={floor <= 1}
                    >
                      <Ionicons name="remove" size={20} color={NAVY} />
                    </TouchableOpacity>
                    <Text style={styles.floorVal}>الطابق {floor}</Text>
                    <TouchableOpacity
                      style={styles.floorBtn}
                      onPress={() => setFloor(p => p + 1)}
                    >
                      <Ionicons name="add" size={20} color={NAVY} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Quantity ─────────────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Header row */}
            <View style={styles.qtyHeaderRow}>
              <Text style={styles.cardTitle}>الكمية</Text>
              {cfg.drinkable && (
                <View style={styles.drinkBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.drinkBadgeText}>صالحة للشرب</Text>
                </View>
              )}
              {!cfg.drinkable && type === 'Well' && (
                <View style={[styles.drinkBadge, { backgroundColor: '#FEE2E2', marginLeft: 8 }]}>
                  <Ionicons name="warning-outline" size={14} color="#EF4444" />
                  <Text style={[styles.drinkBadgeText, { color: '#EF4444' }]}>غير صالحة للشرب (استعمال منزلي فقط)</Text>
                </View>
              )}
              {!cfg.drinkable && type === 'Ashghal' && (
                <View style={[styles.drinkBadge, { backgroundColor: '#FEF3C7', marginLeft: 8 }]}>
                  <Ionicons name="information-circle-outline" size={14} color="#EA580C" />
                  <Text style={[styles.drinkBadgeText, { color: '#EA580C' }]}>للورشات الكبرى، الفلاحة والرياضة</Text>
                </View>
              )}
            </View>

            {/* Big quantity display */}
            <View style={styles.qtyDisplayRow}>
              <TouchableOpacity
                style={[styles.qtyCircleBtn, quantity <= MIN_QTY && { backgroundColor: '#E2E8F0' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuantity(p => Math.max(MIN_QTY, p - STEP_QTY)); }}
                disabled={quantity <= MIN_QTY}
              >
                <Ionicons name="remove" size={24} color={quantity <= MIN_QTY ? '#94A3B8' : WHITE} />
              </TouchableOpacity>

              <View style={styles.qtyValueWrap}>
                <TextInput
                  style={styles.qtyValueInput}
                  value={quantity === 0 ? '' : quantity.toString()}
                  placeholder={MIN_QTY.toString()}
                  placeholderTextColor="#CBD5E1"
                  onChangeText={val => {
                    let n = parseInt(val) || 0;
                    if (n > MAX_QTY) n = MAX_QTY;
                    setQuantity(n);
                  }}
                  onBlur={() => {
                    if (quantity < MIN_QTY) setQuantity(MIN_QTY);
                  }}
                  keyboardType="numeric"
                  textAlign="center"
                  maxLength={5}
                />
                <Text style={styles.qtyUnit}>لتر</Text>
              </View>

              <TouchableOpacity
                style={[styles.qtyCircleBtn, { backgroundColor: NAVY }, quantity >= MAX_QTY && { backgroundColor: '#E2E8F0' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuantity(p => Math.min(MAX_QTY, Math.max(MIN_QTY, p + STEP_QTY))); }}
                disabled={quantity >= MAX_QTY}
              >
                <Ionicons name="add" size={24} color={quantity >= MAX_QTY ? '#94A3B8' : WHITE} />
              </TouchableOpacity>
            </View>

            {/* Quick select chips */}
            <View style={styles.quickRow}>
              {QUICK_QTYS.filter(q => q <= MAX_QTY && q >= MIN_QTY).map(q => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickChip, quantity === q && { backgroundColor: NAVY, borderColor: NAVY }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuantity(q); }}
                >
                  <Text style={[styles.quickChipText, quantity === q && { color: WHITE }]}>
                    {q >= 1000 ? `${q / 1000}k` : q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.qtyHint}>+{STEP_QTY} لتر لكل ضغطة · الحد الأقصى {MAX_QTY.toLocaleString('en-US')} لتر</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      {!isKeyboardVisible && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_INSET) + 12 }]}>
          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!draftOrder.location) { triggerShake(); Alert.alert('تنبيه', 'يرجى تحديد موقع التوصيل أولاً'); return; }
              const title = `${cfg.title} · ${quantity} لتر`;
              router.push({ pathname: '/(customer)/schedule-order', params: { orderTitle: title, isTanker: 'true' } });
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={NAVY} />
            <Text style={styles.scheduleBtnText}>جدولة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.orderBtn, { backgroundColor: YELLOW }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleOrderNow(); }}
          >
            <Text style={styles.orderBtnText}>اطلب الآن</Text>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Header
  header: {
    height: 64,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: NAVY,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo-Bold', color: WHITE },

  // Map
  mapSection: { marginBottom: 0 },
  mapBox: { height: 200, backgroundColor: '#CBD5E1', overflow: 'hidden' },
  mapGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(1,32,71,0.08)',
  },
  mapPin: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationStrip: {
    backgroundColor: WHITE,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  locationStripLeft: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  locationDot: { width: 10, height: 10, borderRadius: 5 },
  locationLabel: { fontSize: 13, fontFamily: 'Cairo-Bold', color: NAVY },
  locationAddr: { fontSize: 12, fontFamily: 'Cairo-Regular', color: '#64748B', marginTop: 2 },
  changeLocBtn: {
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  changeLocText: { fontSize: 13, fontFamily: 'Cairo-Bold' },

  // Card
  card: {
    backgroundColor: WHITE,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY, textAlign: 'right', marginBottom: 16 },

  // Location grid
  locationGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 10 },
  locOpt: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
  },
  locOptLabel: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#94A3B8' },

  // Floor
  floorRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  floorLabel: { fontSize: 15, fontFamily: 'Cairo-Bold', color: NAVY },
  floorControl: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16 },
  floorBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  floorVal: { fontSize: 17, fontFamily: 'Cairo-Bold', color: NAVY, minWidth: 80, textAlign: 'center' },

  // Quantity card
  qtyHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  drinkBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  drinkBadgeText: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#059669' },

  qtyDisplayRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  qtyCircleBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: NAVY,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  qtyValueWrap: { alignItems: 'center' },
  qtyValueInput: {
    fontSize: 48,
    fontFamily: 'Cairo-Bold',
    color: NAVY,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  qtyUnit: { fontSize: 16, fontFamily: 'Cairo-Regular', color: '#64748B', marginTop: -4 },

  quickRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 8, marginBottom: 14 },
  quickChip: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
  },
  quickChipText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#64748B' },

  qtyHint: { fontSize: 11, fontFamily: 'Cairo-Regular', color: '#94A3B8', textAlign: 'center' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row-reverse',
    gap: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  scheduleBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  scheduleBtnText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY },
  orderBtn: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 8,
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  orderBtnText: { fontSize: 18, fontFamily: 'Cairo-Bold', color: NAVY },
});
