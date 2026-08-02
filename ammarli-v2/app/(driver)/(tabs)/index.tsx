import React, { useState, useEffect, useRef } from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Dimensions, Switch, Modal, Animated, ActivityIndicator, AppState, Vibration, Alert, TextInput } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useDriverStore } from '../../../src/store/useDriverStore';
import NewOrderCard, { ORDER_TYPES, OrderType } from '../../../components/NewOrderCard';
import UpdateInventoryModal from '../../../components/UpdateInventoryModal';
import { useDriverAlert } from '../../../src/hooks/useDriverAlert';
import { useAuthStore } from '../../../src/store/useAuthStore';

const { width } = Dimensions.get('window');
const COLORS = { 
  primary: '#002147', 
  secondary: '#FFCC00', 
  background: '#F8F9FA', 
  white: '#FFFFFF', 
  success: '#4ADE80', 
  warning: '#F59E0B', 
  danger: '#EF4444', 
  textSecondary: '#64748B' 
};

// مكون صندوق حالة المخزون
const StockBox = ({ label, val, status, color, bg }: any) => (
  <View style={[styles.stockBox, { backgroundColor: bg }]}>
    <Text style={[styles.boxLabel, { color }]}>{label}</Text>
    <Text style={styles.boxVal}>{val}</Text>
    <View style={[styles.statusTag, { borderColor: color }]}><Text style={[styles.statusTagText, { color }]}>{status}</Text></View>
  </View>
);

// خريطة ألوان وعناوين نوع المياه
const WATER_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  spring:       { label: 'مياه ينابيع',  color: '#0EA5E9', icon: 'water'               },
  well:         { label: 'مياه آبار',    color: '#16A34A', icon: 'water-well-outline'  },
  construction: { label: 'مياه أشغال',  color: '#D97706', icon: 'dump-truck'          },
};

// مكون سعة الخزان (لأصحاب الصهاريج) — يعرض نوع المياه الصحيح
const TankCapacityCard = () => {
  const registeredDriver = useDriverStore(s => s.registeredDriver);
  const remaining = useDriverStore(s => s.inventory.tanker.remaining);
  const totalCapacity = registeredDriver?.capacity || 5000;
  const wType = (registeredDriver?.waterType || 'spring').toLowerCase();
  const meta = WATER_TYPE_META[wType] || WATER_TYPE_META.spring;

  const size = 130;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circum = radius * 2 * Math.PI;
  const progress = remaining / totalCapacity;

  return (
    <View style={styles.bottomSection}>
      <View style={styles.tankCard}>
        <View style={styles.tankHeaderTarget}>
          <Text style={styles.tankTitleTarget}>سعة الخزان</Text>
          {/* شارة نوع المياه */}
          <View style={[styles.waterTypeBadge, { backgroundColor: meta.color + '20', borderColor: meta.color }]}>
            <MaterialCommunityIcons name={meta.icon as any} size={14} color={meta.color} />
            <Text style={[styles.waterTypeBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.progressContainerTarget}>
          <View style={styles.outerCircleTarget}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
              <Circle stroke="#F1F5F9" fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} />
              <Circle stroke={meta.color} fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth}
                strokeDasharray={`${circum} ${circum}`} strokeDashoffset={circum * (1 - progress)}
                strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
            </Svg>
            <View style={styles.innerCircleTarget}>
              <Text style={[styles.capacityTextTarget, { color: meta.color }]}>{remaining}L</Text>
              <Text style={styles.totalTextTarget}>/ {totalCapacity}L</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.fillButtonTarget, { borderColor: meta.color }]}>
           <Text style={[styles.fillButtonTextTarget, { color: meta.color }]}>تعبئة الخزان</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// جميع العلامات التجارية مع صورها
const BRAND_ASSETS: Record<string, any> = {
  'Ifri':           require('../../../assets/images/brands/ifri.png'),
  'Guedila':        require('../../../assets/images/brands/guedila.png'),
  'Saida':          require('../../../assets/images/brands/saida.png'),
  'Lalla Khedidja': require('../../../assets/images/brands/lalla-khedidja.png'),
  'Mansourah':      require('../../../assets/images/brands/mansourah.png'),
  'Toudja':         require('../../../assets/images/brands/toudja.png'),
  'Youkous':        require('../../../assets/images/brands/youkous.png'),
  'Messerghine':    require('../../../assets/images/brands/messerghine.png'),
  'Texanna':        require('../../../assets/images/brands/texanna.png'),
  'Hayat':          require('../../../assets/images/brands/hayat.jpg'),
};

// مكون قائمة الجرد (لبائعي القوارير) — يعرض فقط العلامات التي اختارها السائق
const InventoryListCard = () => {
  const registeredBrands = useDriverStore(s => s.registeredDriver?.brands ?? []);
  const [selectedBrand, setSelectedBrand] = useState(registeredBrands[0] ?? '');
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // بناء قائمة العلامات الديناميكية
  const brands = registeredBrands
    .filter(id => BRAND_ASSETS[id])
    .map(id => ({ id, name: id, logo: BRAND_ASSETS[id], count: 0 }));

  if (brands.length === 0) {
    return (
      <View style={styles.inventoryCard}>
        <Text style={[styles.inventoryTitle, { textAlign: 'center', color: COLORS.textSecondary }]}>
          لم يتم اختيار أي علامة تجارية
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.inventoryCard}>
      <View style={styles.inventoryHeader}>
         <View style={styles.badge}><Text style={styles.badgeText}>قوارير</Text></View>
         <Text style={styles.inventoryTitle}>المخزون الحالي</Text>
      </View>

      {/* التبديل بين العلامات التجارية */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandScroll}>
        {brands.map((brand) => (
          <TouchableOpacity 
            key={brand.id} 
            style={[styles.brandBtn, selectedBrand === brand.id && styles.brandBtnActive]}
            onPress={() => setSelectedBrand(brand.id)}
          >
            <View style={styles.brandCircle}>
              <Image source={brand.logo} style={{ width: 28, height: 28 }} resizeMode="contain" />
            </View>
            <Text style={styles.brandName}>{brand.name}</Text>
            <Text style={styles.brandCount}>المجموع: {brand.count}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.subTitle}>حالة المخزون</Text>
      
      {/* شبكة الحالة الملونة */}
      <View style={styles.stockGrid}>
        <StockBox label="0.5 لتر" val="25" status="ممتلئ" color={COLORS.success} bg="#F0FDF4" />
        <StockBox label="1.5 لتر" val="15" status="منخفض" color={COLORS.warning} bg="#FFFBEB" />
        <StockBox label="5 لتر" val="10" status="فارغ" color={COLORS.danger} bg="#FEF2F2" />
      </View>

      {/* زر تعبئة المخزون — يفتح المودال */}
      <TouchableOpacity
        style={styles.refillBtnInv}
        onPress={() => setShowInventoryModal(true)}
        activeOpacity={0.85}
      >
         <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
         <Text style={styles.refillTextInv}>تعبئة المخزون</Text>
      </TouchableOpacity>

      {/* مودال تحديث المخزون */}
      <UpdateInventoryModal
        visible={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
      />
    </View>
  );
};

export default function DriverDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const isOnline = useDriverStore(s => s.isOnline);
  const setIsOnline = useDriverStore(s => s.setIsOnline);
  const [showOrder, setShowOrder] = useState(false);

  // تشغيل صوت تنبيه + اهتزاز متكرر طوال مدة ظهور بطاقة الطلبية
  useDriverAlert(showOrder);

  // Radar Animation Refs
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  // Toggle Online/Offline State
  const toggleStatus = async () => {
    Vibration.vibrate(50);
    const newValue = !isOnline;
    setIsOnline(newValue);
    if (newValue) {
      useDriverStore.getState().setDriverStatus('AVAILABLE');
      await useDriverStore.getState().startLocationTracking();
    } else {
      useDriverStore.getState().setDriverStatus('OFFLINE');
      useDriverStore.getState().stopLocationTracking();
    }
  };

  // Radar Animation Logic
  useEffect(() => {
    if (isOnline) {
      pulseAnim.setValue(0);
      opacityAnim.setValue(0.6);
      
      Animated.loop(
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [isOnline]);

  const radarScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  // ── موقع السائق ────────────────────────────────────────────────
  const [showLocationModal,  setShowLocationModal]  = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [driverAddress,      setDriverAddress]      = useState<string | null>(null);
  const updateDriverLocation = useDriverStore(s => s.updateDriverLocation);

  // انيميشن البطاقة المنبثقة
  const slideAnim    = useRef(new Animated.Value(600)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // يمنع إعادة إظهار الطلبية عند العودة من تطبيق خارجي (قوقل ماب...)
  const popupFired   = useRef(false);
  const appState     = useRef(AppState.currentState);

  // تتبع حالة التطبيق (foreground / background)
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  // جلب بيانات السائق من الباكند عند أول تحميل
  useEffect(() => {
    useDriverStore.getState().fetchDriverProfile();
  }, []);

  // قراءة بيانات السائق من Store مباشرة
  const registeredDriver = useDriverStore(s => s.registeredDriver);
  const driverStatus     = useDriverStore(s => s.driverStatus);
  const activeDriverOrders = useDriverStore(s => s.activeDriverOrders);
  const incomingOrdersQueue = useDriverStore(s => s.incomingOrdersQueue);
  const currentOffer = incomingOrdersQueue[0];
  const totalEarnings    = useDriverStore(s => s.totalEarnings);
  const completedTrips   = useDriverStore(s => s.completedTrips);
  const setDriverBusy    = useDriverStore(s => s.setDriverBusy);
  const refuseDriverOrder = useDriverStore(s => s.refuseDriverOrder);
  const markOrderAsCompleted = useDriverStore(s => s.markOrderAsCompleted);
  const isSuspended      = useDriverStore(s => s.isSuspended);
  const appCommissionDebt = useDriverStore(s => s.appCommissionDebt);

  // اسم السائق: يأخذ اولا من بيانات السائق (بعد جلب البروفايل) ثم من auth store
  const authProfile    = useAuthStore(s => s.userProfile);
  const driver_name    = registeredDriver?.name || [authProfile?.firstName, authProfile?.lastName].filter(Boolean).join(' ') || 'السائق';
  const isBottled      = registeredDriver?.driverType === 'Bottled';
  const wType          = (registeredDriver?.waterType || 'spring').toLowerCase();

  // تحديد نوع الطلب المناسب لهذا السائق
  const resolveOrderType = (): OrderType => {
    if (registeredDriver?.driverType === 'Bottled') return ORDER_TYPES.BOTTLES;
    switch (registeredDriver?.waterType) {
      case 'well':         return ORDER_TYPES.WELL;
      case 'construction': return ORDER_TYPES.CONSTRUCTION;
      default:             return ORDER_TYPES.SPRING;
    }
  };

  // ── طلب صلاحية الموقع عند فتح التطبيق ───────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setShowLocationModal(true);
      } else {
        fetchDriverLocation();
      }
    })();
  }, []);

  // ── بطاقة الطلب: تظهر فقط عندما يكون هناك طلب قيد الانتظار ────────────
  useEffect(() => {
    // If there is a pending order, show it regardless of AppState so that when the user
    // switches tabs on Web, the modal is already rendered and visible.
    // Native background notifications handle waking the user up.
    if (currentOffer) {
      setShowOrder(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 55, friction: 11 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      
      // Auto-dismiss after 16 seconds if no action
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => {
        handleDecline();
      }, 16000);
    } else {
      dismissOrder();
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [currentOffer]);

  const dismissOrder = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 280, useNativeDriver: true }),
    ]).start(() => setShowOrder(false));
  };

  // ── جلب الموقع وحفظه ────────────────────────────────────────────────
  const fetchDriverLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      updateDriverLocation(loc.coords.latitude, loc.coords.longitude);
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo.length > 0) {
          const g = geo[0];
          setDriverAddress(g.district || g.street || g.city || 'موقعك الحالي');
        }
      } catch (_) {}
    } catch (_) {}
  };

  const requestLocationPermission = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await fetchDriverLocation();
      }
    } catch (_) {}
    finally {
      setIsFetchingLocation(false);
      setShowLocationModal(false);
    }
  };

  // القبول: أغلق البوباب واحفظ الطلبية في الصفحة الرئيسية
  const handleAccept = async () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissOrder();
    
    if (currentOffer) {
      try {
        await useDriverStore.getState().acceptDriverOrder(currentOffer);
      } catch (error) {
        console.error('Lock failed from map', error);
        return;
      }
    }

    const orderType = resolveOrderType();
    const orderItems = currentOffer?.items?.map((item: any, index: number) => ({
      id: index,
      name: item.description,
      qty: item.qty || 1,
      unit: item.detail,
      price: item.unitPrice || item.price,
      image: null
    })) || [];

    const isSpringTanker = registeredDriver?.driverType === 'Tanker' && registeredDriver?.waterType?.toLowerCase() === 'spring';
    const isBottled = registeredDriver?.driverType === 'Bottled';
    const hasDefaultPrice = registeredDriver?.defaultPrice !== undefined && registeredDriver?.defaultPrice > 0;
    const hasBottledPrices = registeredDriver?.bottledPrices !== undefined
      && Object.values(registeredDriver.bottledPrices).every((v) => v > 0);

    const params: any = {
      orderId: currentOffer.orderId,
      customerName: currentOffer?.customer?.name || 'الزبون',
      customerPhone: currentOffer?.customer?.phone || '',
      customerLat: currentOffer?.deliveryAddress?.lat?.toString() || '',
      customerLng: currentOffer?.deliveryAddress?.lng?.toString() || '',
      price: currentOffer?.total?.toString() || '0',
      address: currentOffer?.deliveryAddress?.label || 'الجزائر',
      orderType,
      capacity: currentOffer?.items?.[0]?.detail?.replace(/\D/g, '') || '1000',
      floor: currentOffer?.items?.[0]?.floor || 'غير محدد',
      distance: currentOffer?.deliveryAddress?.distance || '0 كم',
      rating: '5.0',
      items: JSON.stringify(orderItems),
    };

    // ✅ سائقو الجملة (آبار/أشغال) فقط يتحولون لـ BUSY — سائقو التجزئة يبقون AVAILABLE
    const isRetail = isSpringTanker || isBottled;
    if (!isRetail) {
      useDriverStore.getState().setDriverStatus('BUSY');
    }

    // ── Fast Accept: حساب السعر تلقائياً ──
    if (isSpringTanker && hasDefaultPrice) {
      // ينابيع: سعر الدلو × (اللترات ÷ 20)
      const requestedLiters = parseFloat(params.capacity) || 1000;
      const calculatedTotal = (requestedLiters / 20) * registeredDriver!.defaultPrice!;
      if (calculatedTotal > 0) {
        await useDriverStore.getState().updateDriverOrderStatus('driving', calculatedTotal, currentOffer.orderId);
        params.price = calculatedTotal.toString();
        router.push({ pathname: '/(driver)/order-details' as any, params });
        return;
      }
    }

    if (isBottled && hasBottledPrices) {
      // قوارير: لكل حجم سعره الخاص (0.5L, 1.5L, 5L)
      const prices = registeredDriver!.bottledPrices!;
      const calculatedTotal = orderItems.reduce((sum: number, item: any) => {
        const size = item.unit as '0.5L' | '1.5L' | '5L';
        const unitPrice = prices[size] ?? 0;
        return sum + (item.qty * unitPrice);
      }, 0);
      if (calculatedTotal > 0) {
        await useDriverStore.getState().updateDriverOrderStatus('driving', calculatedTotal, currentOffer.orderId);
        params.price = calculatedTotal.toString();
        router.push({ pathname: '/(driver)/order-details' as any, params });
        return;
      }
    }

    router.push({
      pathname: '/(driver)/order-acceptance' as any,
      params,
    });
  };


  const handleDecline = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissOrder();
    if (currentOffer?.orderId) {
      refuseDriverOrder(currentOffer.orderId);
      useDriverStore.getState().shiftIncomingQueue();
    }
  };





  return (
    <ScreenContainer backgroundColor="#FFF" statusBarStyle="dark-content" statusBarColor="#FFF">
      <StatusBar barStyle="dark-content" />

      {/* ── مودال السماح بالموقع ── */}
      <Modal visible={showLocationModal} transparent animationType="fade">
        <View style={styles.locationOverlay}>
          <View style={styles.locationCard}>
            {/* أيقونة */}
            <View style={styles.locationIconWrap}>
              <Ionicons name="navigate" size={36} color={COLORS.primary} />
            </View>

            <Text style={styles.locationTitle}>تفعيل الموقع</Text>
            <Text style={styles.locationBody}>
              {'نحتاج لمعرفة موقعك الحالي لإخطارك بالطلبات القريبة منك\nولتتبع رحلاتك بدقة.'}
            </Text>

            {/* زر السماح */}
            <TouchableOpacity
              style={styles.locationAllowBtn}
              onPress={requestLocationPermission}
              activeOpacity={0.8}
              disabled={isFetchingLocation}
            >
              {isFetchingLocation ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="locate" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.locationAllowText}>السماح بالوصول</Text>
                </>
              )}
            </TouchableOpacity>

            {/* زر التجاهل */}
            <TouchableOpacity
              style={styles.locationDenyBtn}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.locationDenyText}>ليس الآن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── البطاقة المنبثقة للطلب الجديد ── */}
      {showOrder && (
        <Modal transparent animationType="none" statusBarTranslucent>
          {/* خلفية شفافة */}
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={dismissOrder} />
          </Animated.View>

          {/* البطاقة تنبثق من الأسفل */}
          <Animated.View
            style={[
              styles.orderPopup,
              { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] },
            ]}
            pointerEvents="box-none"
          >
            <NewOrderCard
              orderType={resolveOrderType()}
              customerName={currentOffer?.customer?.name || 'الزبون'}
              price={Number(currentOffer?.total || 0)}
              address={currentOffer?.deliveryAddress?.label || ''}
              distance={currentOffer?.deliveryAddress?.distance || '---'}
              quantity={currentOffer?.items?.map(i => i.detail).join(' + ') || ''}
              rating={5.0} // Hardcoded rating for now as it's not in active order
              totalSeconds={30}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          </Animated.View>
        </Modal>
      )}
      
      {/* 1. Top Header */}
      <View style={styles.headerTarget}>
        <TouchableOpacity style={styles.iconButtonTarget} onPress={() => router.push('/(driver)/notifications')}>
          <Ionicons name="notifications-outline" size={26} color={COLORS.primary} />
          {useDriverStore(s => s.notifications.some(n => !n.isRead)) && (
            <View style={styles.dotTarget} />
          )}
        </TouchableOpacity>
        <Text style={styles.greetingTextTarget}>مرحبا {driver_name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}>
        
        {/* 2. Quick Stats Cards */}
        <View style={styles.statsContainerTarget}>
          <View style={[styles.statCardTarget, { backgroundColor: COLORS.secondary }]}>
            <Text style={[styles.statLabelTarget, { color: COLORS.primary }]}>الطلبات المكتملة</Text>
            <Text style={[styles.statValueTarget, { color: COLORS.primary }]}>{completedTrips} رحلات</Text>
          </View>
          <View style={[styles.statCardTarget, { backgroundColor: COLORS.primary }]}>
            <Text style={[styles.statLabelTarget, { color: '#FFF' }]}>أرباح اليوم</Text>
            <Text style={[styles.statValueTarget, { color: '#FFF' }]}>{(totalEarnings || 0).toLocaleString('ar-DZ')} د.ج</Text>
          </View>
        </View>

        {/* 3. Central Action Area (Radar) */}
        <View style={styles.centralAreaTarget}>
          {isOnline && (
            <Animated.View 
              style={[
                styles.radarCircleTarget, 
                { 
                  transform: [{ scale: radarScale }],
                  opacity: opacityAnim
                }
              ]} 
            />
          )}

          {isSuspended && (
            <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FEE2E2', alignItems: 'center' }}>
               <MaterialCommunityIcons name="alert-circle" size={24} color={COLORS.danger} style={{ marginBottom: 5 }} />
               <Text style={{ fontFamily: 'Cairo-Bold', color: COLORS.danger, textAlign: 'center' }}>
                 تم إيقاف حسابك مؤقتاً لتجاوز ديون العمولة ({(appCommissionDebt || 0).toLocaleString('ar-DZ')} د.ج).
               </Text>
               <Text style={{ fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                 يرجى تسديد المستحقات للعميل لإعادة تفعيل حسابك واستقبال الطلبات.
               </Text>
            </View>
          )}

          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={isSuspended ? undefined : toggleStatus}
            style={[
              styles.mainActionButtonTarget,
              isOnline ? styles.buttonOnlineTarget : styles.buttonOfflineTarget,
              isSuspended && { backgroundColor: '#CBD5E1', opacity: 0.8 }
            ]}
          >
            <Text style={styles.buttonTextTarget}>
              {isOnline ? 'إيقاف العمل' : 'ابدأ العمل'}
            </Text>
          </TouchableOpacity>
          
          {isOnline && !isSuspended && <Text style={styles.statusSubtextTarget}>جاري استقبال الطلبات...</Text>}
        </View>

        {/* لوحة المعلومات مفلترة حسب نوع المياه / فئة السائق */}
        {isBottled ? <InventoryListCard /> : <TankCapacityCard />}
        

        {/* قسم الطلبات الحالية المشترك */}
        <View style={styles.orderSection}>
           <Text style={styles.sectionTitle}>الطلبات الحالية ({activeDriverOrders.filter(o => o.status !== 'pending').length})</Text>
           {activeDriverOrders.filter(o => o.status !== 'pending').length > 0 ? (
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 15 }}>
               {activeDriverOrders.filter(o => o.status !== 'pending').map(order => (
                 <TouchableOpacity 
                   key={order.orderId}
                   activeOpacity={0.9}
                   style={[styles.activeOrderCard, { width: width * 0.8, marginHorizontal: 0 }]}
                   onPress={() => router.push({ pathname: '/(driver)/order-details' as any, params: { orderId: order.orderId } })}
                 >
                    <View style={styles.activeOrderHeader}>
                       <Ionicons name="car-sport" size={46} color={COLORS.primary} />
                       <View style={{ flex: 1, marginLeft: 10 }}>
                         <Text style={styles.activeOrderName}>{order.customer.name}</Text>
                         <Text style={styles.activeOrderAddress}>{order.deliveryAddress.label}</Text>
                       </View>
                    </View>
                 </TouchableOpacity>
               ))}
             </ScrollView>
           ) : (
             <View style={styles.emptyOrder}><Text style={styles.emptyText}>لا توجد طلبات حالياً قيد التوصيل</Text></View>
           )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, borderBottomRightRadius: 20, borderBottomLeftRadius: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1F5F9', paddingHorizontal: 10, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '800' },
  userSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  avatar: { width: 50, height: 50, borderRadius: 16, borderWidth: 2, borderColor: COLORS.secondary },
  statsRow: { flexDirection: 'row', gap: 15, padding: 20 },
  statCard: { flex: 1, padding: 20, borderRadius: 24, elevation: 4 },
  statLabelLight: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textAlign: 'left' },
  statValueWhite: { fontSize: 22, fontWeight: '900', color: COLORS.white, textAlign: 'left', marginTop: 5 },
  statLabelDark: { fontSize: 12, color: 'rgba(0,33,71,0.6)', fontWeight: '800', textAlign: 'left' },
  statValueDark: { fontSize: 22, fontWeight: '900', color: COLORS.primary, textAlign: 'left', marginTop: 5 },
  
  // أنماط خاصة بالصهريج
  tankCard: { marginHorizontal: 20, marginBottom: 20, backgroundColor: COLORS.white, borderRadius: 32, padding: 25, alignItems: 'center', elevation: 2 },
  tankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 25 },
  tankTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  waterBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  waterBadgeText: { fontSize: 12, fontWeight: '900', color: '#0284C7' },
  waterTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  waterTypeBadgeText: { fontSize: 12, fontFamily: 'Cairo-Bold', fontWeight: '800' },
  progressContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  progressTextCenter: { position: 'absolute', alignItems: 'center' },
  currentLitres: { fontSize: 32, fontWeight: '900', color: COLORS.primary },
  totalLitres: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  refillBtn: { width: '100%', height: 55, borderRadius: 28, borderWidth: 2, borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  refillText: { fontSize: 16, fontWeight: '800', color: '#3B82F6' },
  
  // أنماط خاصة بالجرد والقوارير
  inventoryCard: { marginHorizontal: 20, marginBottom: 20, backgroundColor: COLORS.white, borderRadius: 32, padding: 24, elevation: 2 },
  inventoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  inventoryTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, textAlign: 'left' },
  badge: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '900', color: COLORS.primary },
  brandScroll: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  brandBtn: { width: 105, backgroundColor: '#F8FAFC', borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  brandBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.white, elevation: 3 },
  brandCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginBottom: 10, elevation: 1 },
  brandName: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  brandCount: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700' },
  subTitle: { fontSize: 12, fontWeight: '900', color: COLORS.textSecondary, textAlign: 'left', marginBottom: 15 },
  stockGrid: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  stockBox: { flex: 1, height: 110, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 10 },
  boxLabel: { fontSize: 12, fontWeight: '900', marginBottom: 5 },
  boxVal: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  statusTag: { marginTop: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusTagText: { fontSize: 10, fontWeight: '900' },
  refillBtnInv: { height: 55, backgroundColor: COLORS.primary, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 3 },
  refillTextInv: { fontSize: 16, fontWeight: '900', color: COLORS.white },
  
  testNotifBtn: { marginHorizontal: 20, marginBottom: 15, backgroundColor: COLORS.warning, height: 50, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 3 },
  testNotifText: { color: COLORS.white, fontSize: 14, fontFamily: 'Cairo-Bold' },
  

  
  // أنماط مشتركة أسفل الشاشة
  orderSection: { paddingHorizontal: 20, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary, textAlign: 'left', marginBottom: 15 },
  emptyOrder: { height: 100, backgroundColor: COLORS.white, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0' },
  emptyText: { color: COLORS.textSecondary, fontWeight: '700', fontFamily: 'Cairo-SemiBold' },

  // ── Popup order card ──────────────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  orderPopup: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },

  // ── Location permission modal ────────────────────────────────────────────
  locationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCard: {
    backgroundColor: COLORS.white,
    width: '85%',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  locationIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 22,
    fontFamily: 'Cairo-Black',
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  locationBody: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  locationAllowBtn: {
    backgroundColor: COLORS.secondary,
    width: '100%',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  locationAllowText: {
    fontFamily: 'Cairo-Black',
    fontSize: 16,
    color: COLORS.primary,
  },
  locationDenyBtn: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  locationDenyText: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  // Target Styles
  headerTarget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 20,
    marginBottom: 30,
  },
  greetingTextTarget: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Cairo-Bold',
  },
  iconButtonTarget: {
    padding: 5,
  },
  dotTarget: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  statsContainerTarget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  statCardTarget: {
    width: '48%',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statLabelTarget: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.8,
    fontFamily: 'Cairo-Bold',
  },
  statValueTarget: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Cairo-Black',
  },
  centralAreaTarget: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  radarCircleTarget: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.secondary,
    zIndex: -1,
  },
  mainActionButtonTarget: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#FFF',
    elevation: 15,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  buttonOfflineTarget: {
    backgroundColor: COLORS.primary,
  },
  buttonOnlineTarget: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.secondary,
  },
  buttonTextTarget: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Cairo-Bold',
  },
  statusSubtextTarget: {
    marginTop: 20,
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
    opacity: 0.6,
    fontFamily: 'Cairo-Bold',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  tankHeaderTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'center',
    gap: 8,
  },
  tankTitleTarget: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Cairo-Bold',
  },
  progressContainerTarget: {
    marginBottom: 20,
    alignItems: 'center',
  },
  outerCircleTarget: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircleTarget: {
    alignItems: 'center',
  },
  capacityTextTarget: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    fontFamily: 'Cairo-Black',
  },
  totalTextTarget: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: 'bold',
    fontFamily: 'Cairo-SemiBold',
  },
  fillButtonTarget: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fillButtonTextTarget: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Cairo-Bold',
  },
  
  // Active Order Card Styles
  activeOrderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginTop: 5,
  },
  activeOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  activeOrderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Cairo-Black',
    textAlign: 'left',
  },
  activeOrderAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Cairo-SemiBold',
    marginTop: 2,
    textAlign: 'left',
  },
  activeOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 15,
  },
  activeOrderPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    fontFamily: 'Cairo-Black',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  continueBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
  },
});
