import React, { useState, useEffect, useRef } from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar, Dimensions, Switch, Modal, Animated, ActivityIndicator, AppState, Vibration, Alert, TextInput } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
    <BlurView intensity={70} tint="light" style={styles.inventoryCard}>
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
        <StockBox label="0.5 لتر" val="25" status="ممتلئ" color={COLORS.success} bg="rgba(74,222,128,0.1)" />
        <StockBox label="1.5 لتر" val="15" status="منخفض" color={COLORS.warning} bg="rgba(245,158,11,0.1)" />
        <StockBox label="5 لتر" val="10" status="فارغ" color={COLORS.danger} bg="rgba(239,68,68,0.1)" />
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
    </BlurView>
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

    const driverTypeRaw = registeredDriver?.driverType?.toLowerCase() || '';
    const waterTypeRaw = registeredDriver?.waterType?.toLowerCase() || '';
    const isSpringTanker = driverTypeRaw === 'tanker' && (waterTypeRaw === 'spring' || waterTypeRaw.includes('ينابيع'));
    const isBottled = driverTypeRaw === 'bottled';
    const isWellOrConstructionTanker = driverTypeRaw === 'tanker' && !isSpringTanker;

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
    const driverDefaultPrice = (registeredDriver?.defaultPrice && registeredDriver.defaultPrice > 0) ? registeredDriver.defaultPrice : 150;
    const defaultBottledPrices = { '0.5L': 15, '1.5L': 30, '5L': 100 };
    const driverBottledPrices = registeredDriver?.bottledPrices ? registeredDriver.bottledPrices : defaultBottledPrices;
    
    // إذا لم يحدد السائق سعر الوحدة بعد، نفترض سعراً افتراضياً 1500 لنتجاوز شاشة التأكيد دائماً
    const driverPricePerUnit = Number(registeredDriver?.pricePerUnit) > 0 ? Number(registeredDriver?.pricePerUnit) : 1500;
    const driverFloorPrice   = Number(registeredDriver?.floorPrice) > 0 ? Number(registeredDriver?.floorPrice) : 0;

    if (isSpringTanker) {
      // ينابيع: سعر الدلو × (اللترات ÷ 20)
      const requestedLiters = parseFloat(params.capacity) || 1000;
      const calculatedTotal = (requestedLiters / 20) * driverDefaultPrice;
      if (calculatedTotal > 0) {
        await useDriverStore.getState().updateDriverOrderStatus('driving', calculatedTotal, currentOffer.orderId);
        params.price = calculatedTotal.toString();
        setTimeout(() => {
          router.replace({ pathname: '/(driver)/order-details' as any, params });
        }, 150);
        return;
      }
    }

    if (isBottled) {
      // قوارير: لكل حجم سعره الخاص (0.5L, 1.5L, 5L)
      const prices = driverBottledPrices;
      const calculatedTotal = orderItems.reduce((sum: number, item: any) => {
        const size = item.unit as '0.5L' | '1.5L' | '5L';
        const unitPrice = (prices as any)[size] ?? 0;
        return sum + (item.qty * unitPrice);
      }, 0);
      if (calculatedTotal > 0) {
        await useDriverStore.getState().updateDriverOrderStatus('driving', calculatedTotal, currentOffer.orderId);
        params.price = calculatedTotal.toString();
        setTimeout(() => {
          router.replace({ pathname: '/(driver)/order-details' as any, params });
        }, 150);
        return;
      }
    }

    if (isWellOrConstructionTanker) {
      // آبار / أشغال: (الكمية ÷ 1500) × سعر الوحدة + (الطابق × سعر الطابق)
      const requestedLiters = parseFloat(String(currentOffer?.tankerDetails?.volume || params.capacity)) || 1500;
      const floorNum        = Number(currentOffer?.items?.[0]?.floor || currentOffer?.tankerDetails?.floor || 0);
      const units           = Math.ceil(requestedLiters / 1500);
      let calculatedTotal   = (units * driverPricePerUnit) + (floorNum * driverFloorPrice);

      if (calculatedTotal <= 0) {
        calculatedTotal = Number(currentOffer?.total || 1500);
      }

      await useDriverStore.getState().updateDriverOrderStatus('driving', calculatedTotal, currentOffer.orderId);
      params.price = calculatedTotal.toString();
      setTimeout(() => {
        router.replace({ pathname: '/(driver)/order-details' as any, params });
      }, 150);
      return;
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





  const bgColors = isOnline ? (['#F8FAFC', '#E2E8F0'] as const) : (['#F1F5F9', '#CBD5E1'] as const);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isOnline ? 'dark-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />

      {/* ── مودال السماح بالموقع ── */}
      <Modal visible={showLocationModal} transparent animationType="fade">
        <View style={styles.locationOverlay}>
          <View style={styles.locationCard}>
            <View style={styles.locationIconWrap}>
              <Ionicons name="navigate" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.locationTitle}>تفعيل الموقع</Text>
            <Text style={styles.locationBody}>
              {'نحتاج لمعرفة موقعك الحالي لإخطارك بالطلبات القريبة منك\nولتتبع رحلاتك بدقة.'}
            </Text>
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
            <TouchableOpacity style={styles.locationDenyBtn} onPress={() => setShowLocationModal(false)}>
              <Text style={styles.locationDenyText}>ليس الآن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── البطاقة المنبثقة للطلب الجديد ── */}
      {showOrder && (
        <Modal transparent animationType="none" statusBarTranslucent>
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={dismissOrder} />
          </Animated.View>
          <Animated.View
            style={[
              styles.orderPopup,
              { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] },
            ]}
            pointerEvents="box-none"
          >
            {(() => {
              // ── حساب السعر المعروض في البطاقة قبل القبول ──
              const dTypeRaw  = registeredDriver?.driverType?.toLowerCase() || '';
              const wTypeRaw  = registeredDriver?.waterType?.toLowerCase()  || '';
              const _isSpring = dTypeRaw === 'tanker' && (wTypeRaw === 'spring' || wTypeRaw.includes('ينابيع'));
              const _isBottled = dTypeRaw === 'bottled';
              const _isWell   = dTypeRaw === 'tanker' && (wTypeRaw === 'well' || wTypeRaw.includes('آبار'));
              const _isCons   = dTypeRaw === 'tanker' && (wTypeRaw === 'construction' || wTypeRaw.includes('أشغال'));

              let previewPrice = 0;

              if (_isSpring && (registeredDriver?.defaultPrice ?? 0) > 0) {
                const liters = parseFloat(currentOffer?.items?.[0]?.detail?.replace(/\D/g, '') || '1000') || 1000;
                previewPrice = Math.round((liters / 20) * (registeredDriver?.defaultPrice ?? 0));
              } else if (_isBottled && registeredDriver?.bottledPrices) {
                const offerItems = currentOffer?.items || [];
                previewPrice = offerItems.reduce((sum: number, item: any) => {
                  const unitPrice = (registeredDriver.bottledPrices as any)[item.detail] ?? 0;
                  return sum + ((item.qty || 1) * unitPrice);
                }, 0);
              } else if ((_isWell || _isCons) && Number(registeredDriver?.pricePerUnit) > 0) {
                const liters   = Number(currentOffer?.tankerDetails?.volume || currentOffer?.items?.[0]?.detail?.replace(/\D/g, '') || 1500);
                const floor    = Number(currentOffer?.tankerDetails?.floor || currentOffer?.items?.[0]?.floor || 0);
                const units    = Math.ceil(liters / 1500);
                previewPrice   = Math.round(units * Number(registeredDriver?.pricePerUnit) + floor * Number(registeredDriver?.floorPrice || 0));
              }

              return (
                <NewOrderCard
                  orderType={resolveOrderType()}
                  customerName={currentOffer?.customer?.name || 'الزبون'}
                  price={previewPrice > 0 ? previewPrice : Number(currentOffer?.total || 0)}
                  address={currentOffer?.deliveryAddress?.label || ''}
                  distance={currentOffer?.deliveryAddress?.distance || '---'}
                  quantity={currentOffer?.items?.map((i: any) => i.detail).join(' + ') || ''}
                  rating={5.0}
                  totalSeconds={30}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              );
            })()}
          </Animated.View>
        </Modal>
      )}

      
      {/* 1. Top Floating Header */}
      <View style={[styles.headerTarget, { paddingTop: insets.top + 15 }]}>
        <View style={styles.userInfoWrap}>
          <View style={styles.avatarPlaceholder}>
             <Ionicons name="person" size={24} color={COLORS.primary} />
          </View>
          <View>
             <Text style={styles.greetingTextSmall}>مرحباً،</Text>
             <Text style={styles.greetingTextTarget}>{driver_name}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconButtonTarget} onPress={() => router.push('/(driver)/notifications')}>
          <View style={styles.notifWrap}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
            {useDriverStore(s => s.notifications.some(n => !n.isRead)) && (
              <View style={styles.dotTarget} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}>
        
        {/* 2. Quick Stats Cards (Glassmorphism) */}
        <View style={styles.statsContainerTarget}>
          <BlurView intensity={60} tint="light" style={[styles.statCardTarget, { borderColor: 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.statIconWrap}><Ionicons name="car-outline" size={20} color={COLORS.primary} /></View>
            <Text style={styles.statValueTarget}>{completedTrips}</Text>
            <Text style={styles.statLabelTarget}>رحلة مكتملة</Text>
          </BlurView>
          
          <BlurView intensity={60} tint="light" style={[styles.statCardTarget, { borderColor: 'rgba(255,255,255,0.8)' }]}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.secondary }]}><Ionicons name="wallet-outline" size={20} color={COLORS.primary} /></View>
            <Text style={[styles.statValueTarget, { color: COLORS.primary }]}>{(totalEarnings || 0).toLocaleString('ar-DZ')}</Text>
            <Text style={styles.statLabelTarget}>أرباح اليوم (د.ج)</Text>
          </BlurView>
        </View>

        {/* 3. Central Action Area (Uber-style GO Button) */}
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
            <BlurView intensity={80} tint="light" style={styles.suspendedCard}>
               <MaterialCommunityIcons name="alert-circle" size={28} color={COLORS.danger} style={{ marginBottom: 5 }} />
               <Text style={styles.suspendedTitle}>
                 حسابك مقيد بسبب الديون
               </Text>
               <Text style={styles.suspendedBody}>
                 لتجاوز ديون العمولة ({(appCommissionDebt || 0).toLocaleString('ar-DZ')} د.ج).{'\n'}يمكنك فقط تلقي الطلبات في الولايات أو البلديات المعفاة من سقف الديون.
               </Text>
            </BlurView>
          )}

          <TouchableOpacity 
            activeOpacity={0.85} 
            onPress={toggleStatus}
            style={[
              styles.mainActionButtonTarget,
              isOnline ? styles.buttonOnlineTarget : styles.buttonOfflineTarget,
            ]}
          >
            <View style={styles.innerButtonRing}>
              <Text style={[styles.buttonTextTarget, !isOnline && { color: COLORS.white }]}>
                {isOnline ? 'إيقاف' : 'ابدأ'}
              </Text>
              <Text style={[styles.buttonSubText, !isOnline && { color: 'rgba(255,255,255,0.7)' }]}>
                {isOnline ? 'العمل' : 'العمل الآن'}
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.statusBadge}>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? COLORS.success : COLORS.danger }]} />
            <Text style={styles.statusText}>
              {isOnline ? 'متصل: جاري البحث عن طلبات...' : 'غير متصل'}
            </Text>
          </View>
        </View>

        {/* لوحة المخزون — للسائقين من نوع قوارير فقط */}
        {isBottled && (
          <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
            <InventoryListCard />
          </View>
        )}
        
        {/* قسم الطلبات الحالية المشترك */}
        <View style={styles.orderSection}>
           <Text style={styles.sectionTitle}>الطلبات الحالية ({activeDriverOrders.filter(o => o.status !== 'pending').length})</Text>
           {activeDriverOrders.filter(o => o.status !== 'pending').length > 0 ? (
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15 }}>
               {activeDriverOrders.filter(o => o.status !== 'pending').map(order => (
                 <TouchableOpacity 
                   key={order.orderId}
                   activeOpacity={0.9}
                   style={[styles.activeOrderCard, { width: width * 0.82 }]}
                   onPress={() => router.push({ pathname: '/(driver)/order-details' as any, params: { orderId: order.orderId } })}
                 >
                    <View style={styles.activeOrderHeader}>
                       <View style={styles.activeOrderIconWrap}>
                         <Ionicons name="car-sport" size={24} color={COLORS.primary} />
                       </View>
                       <View style={{ flex: 1 }}>
                         <Text style={styles.activeOrderName}>{order.customer.name}</Text>
                         <Text style={styles.activeOrderAddress} numberOfLines={1}>{order.deliveryAddress.label}</Text>
                       </View>
                       <Ionicons name="chevron-back" size={20} color={COLORS.textSecondary} />
                    </View>
                 </TouchableOpacity>
               ))}
             </ScrollView>
           ) : (
             <BlurView intensity={40} tint="light" style={styles.emptyOrder}>
               <Ionicons name="document-text-outline" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
               <Text style={styles.emptyText}>لا توجد طلبات قيد التوصيل</Text>
             </BlurView>
           )}
        </View>
      </ScrollView>
    </View>
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
  
  
  // أنماط خاصة بالجرد والقوارير
  inventoryCard: { marginHorizontal: 0, marginBottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 32, padding: 24, elevation: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
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

  // Target Styles - Premium Modern Design
  headerTarget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 10,
    marginBottom: 25,
  },
  userInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,33,71,0.1)',
  },
  greetingTextSmall: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Cairo-SemiBold',
    marginBottom: -4,
  },
  greetingTextTarget: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    fontFamily: 'Cairo-Black',
  },
  iconButtonTarget: {
    padding: 2,
  },
  notifWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,33,71,0.1)',
  },
  dotTarget: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  statsContainerTarget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 35,
    gap: 12,
  },
  statCardTarget: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,33,71,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabelTarget: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Cairo-SemiBold',
    marginTop: 2,
  },
  statValueTarget: {
    fontSize: 24,
    color: COLORS.primary,
    fontFamily: 'Cairo-Black',
  },
  centralAreaTarget: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
    minHeight: 220,
  },
  radarCircleTarget: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: COLORS.success,
    zIndex: -1,
  },
  suspendedCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: 'rgba(254,242,242,0.8)',
    alignItems: 'center',
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  suspendedTitle: {
    fontFamily: 'Cairo-Black',
    color: COLORS.danger,
    textAlign: 'center',
    fontSize: 15,
  },
  suspendedBody: {
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  mainActionButtonTarget: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  innerButtonRing: {
    width: 146,
    height: 146,
    borderRadius: 73,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonOfflineTarget: {
    backgroundColor: COLORS.primary,
  },
  buttonOnlineTarget: {
    backgroundColor: COLORS.success,
  },
  buttonTextTarget: {
    fontSize: 32,
    color: COLORS.white,
    fontFamily: 'Cairo-Black',
    marginBottom: -8,
  },
  buttonSubText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Cairo-Bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 25,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusSubtextTarget: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'Cairo-Bold',
  },
  
  // Active Order Card Styles
  activeOrderCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.4)',
    elevation: 0,
  },
  activeOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeOrderIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeOrderName: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: 'Cairo-Black',
    textAlign: 'left',
    marginBottom: 2,
  },
  activeOrderAddress: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'left',
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
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
  },
});
