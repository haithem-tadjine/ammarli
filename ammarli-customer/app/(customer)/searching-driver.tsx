import ScreenContainer from '../../components/ScreenContainer';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Dimensions, Platform, Animated, Image, Alert, Modal, PanResponder
} from 'react-native';
import MapView, { Marker } from '../../components/Map';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCustomerStore } from '../../src/store/useCustomerStore';

const { width } = Dimensions.get('window');

const NAVY   = '#012047';
const YELLOW = '#F3CD0D';
const WHITE  = '#FFFFFF';

// Water type config
const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  Bottled:  { label: 'مياه معبأة',    icon: 'bottle-soda-classic', color: '#0EA5E9' },
  Spring:   { label: 'مياه ينابيع',   icon: 'water',               color: '#0EA5E9' },
  Well:     { label: 'مياه آبار',     icon: 'water-pump',          color: '#7C3AED' },
  Ashghal:  { label: 'مياه أشغال',   icon: 'dump-truck',          color: '#EA580C' },
};

export default function SearchingDriverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeOrder      = useCustomerStore(s => s.activeOrder);
  const userLocation     = useCustomerStore(s => s.userLocation);
  const cancelOrder      = useCustomerStore(s => s.cancelOrder);
  const createOrder      = useCustomerStore(s => s.createOrder);
  const activeOrderStatus = useCustomerStore(s => s.activeOrder?.status);
  const creatingRef      = useRef(false);
  const mapRef           = useRef<any>(null);

  const nearbyDrivers    = useCustomerStore(s => s.nearbyDrivers);
  const fetchNearbyDrivers = useCustomerStore(s => s.fetchNearbyDrivers);

  const coordinates = (activeOrder?.location?.latitude && activeOrder?.location?.longitude) 
    ? activeOrder.location 
    : (userLocation?.latitude && userLocation?.longitude) 
      ? userLocation 
      : { latitude: 35.5557, longitude: 6.1748 };

  const getWaterTypeKey = () => {
    const wt = (activeOrder?.waterType || activeOrder?.type || '').toLowerCase();
    if (wt.includes('spring') || wt.includes('ينابيع')) return 'Spring';
    if (wt.includes('well') || wt.includes('آبار')) return 'Well';
    if (wt.includes('construction') || wt.includes('ashghal') || wt.includes('بناء')) return 'Ashghal';
    if (wt.includes('tanker')) return 'Spring';
    return 'Bottled';
  };
  const typeCfg = TYPE_CONFIG[getWaterTypeKey()] || TYPE_CONFIG['Bottled'];
  
  const locationName = activeOrder?.locationName || userLocation?.address || 'موقع التوصيل';
  const quantity     = activeOrder?.quantity ? `${activeOrder.quantity} لتر` : '';

  const [showEndModal, setShowEndModal] = useState(false);
  const [endModalMsg, setEndModalMsg] = useState('');
  const [endModalType, setEndModalType] = useState<'expired' | 'cancelled'>('expired');

  // ── Animations – ALL use useNativeDriver: true ─────────────────────────────
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Bottom Sheet PanResponder State
  const HIDDEN_HEIGHT = 180;
  const translateY = useRef(new Animated.Value(HIDDEN_HEIGHT)).current;
  const isExpandedRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = isExpandedRef.current ? gestureState.dy : HIDDEN_HEIGHT + gestureState.dy;
        if (newValue >= 0 && newValue <= HIDDEN_HEIGHT) {
          translateY.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) {
          // Swipe up
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          isExpandedRef.current = true;
        } else if (gestureState.dy > 30) {
          // Swipe down
          Animated.spring(translateY, { toValue: HIDDEN_HEIGHT, useNativeDriver: true }).start();
          isExpandedRef.current = false;
        } else {
          // Snap back
          Animated.spring(translateY, { toValue: isExpandedRef.current ? 0 : HIDDEN_HEIGHT, useNativeDriver: true }).start();
        }
      }
    })
  ).current;

  useEffect(() => {
    // Initial entrance
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Dots bounce – useNativeDriver: true (opacity + translateY only)
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 3, duration: 900, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 0,   useNativeDriver: true }),
      ])
    ).start();

    // Fetch order state only if not a local draft being created
    const currentOrder = useCustomerStore.getState().activeOrder;
    if (!(typeof currentOrder?.id === 'string' && currentOrder.id.startsWith('local-'))) {
      useCustomerStore.getState().fetchActiveOrder();
    }

    // Polling nearby drivers
    fetchNearbyDrivers(coordinates.latitude, coordinates.longitude, 15);
    const intervalId = setInterval(() => {
      fetchNearbyDrivers(coordinates.latitude, coordinates.longitude, 15);
    }, 7000);

    return () => clearInterval(intervalId);
  }, []);

  // Map Auto-Zoom
  useEffect(() => {
    if (mapRef.current && nearbyDrivers && nearbyDrivers.length > 0) {
      const coords = nearbyDrivers.map(d => ({ latitude: d.lat, longitude: d.lng }));
      coords.push(coordinates); // Add customer location
      
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 120, right: 60, bottom: 450, left: 60 },
          animated: true,
        });
      }, 500);
    }
  }, [nearbyDrivers]);

  // Navigation observer
  useEffect(() => {
    if (!activeOrderStatus) return;
    if (['picked_up', 'delivering', 'driving'].includes(activeOrderStatus)) {
      setTimeout(() => router.replace('/(customer)/order-tracking'), 300);
    } else if (activeOrderStatus === 'arrived') {
      setTimeout(() => router.replace('/(customer)/driver-arrived'), 300);
    }
  }, [activeOrderStatus, router]);

  // Send order to backend
  useEffect(() => {
    if (activeOrder && typeof activeOrder.id === 'string' && activeOrder.id.startsWith('local-') && !creatingRef.current) {
      creatingRef.current = true;
      createOrder(activeOrder).catch(e => {
        creatingRef.current = false;
        Alert.alert('خطأ', 'تعذر إرسال الطلب: ' + (e?.response?.data?.message || e.message || 'خطأ غير معروف'),
          [{ text: 'حسناً', onPress: () => router.back() }]);
      });
    } else if (activeOrder?.status === 'cancelled' || activeOrder?.status === 'expired') {
      const isExpired = activeOrder.status === 'expired';
      setEndModalType(isExpired ? 'expired' : 'cancelled');
      setEndModalMsg(isExpired ? 'عذراً، لم نعثر على سائق متاح حالياً.\nيرجى المحاولة مرة أخرى لاحقاً.' : 'تم إلغاء الطلب بنجاح.');
      useCustomerStore.getState().clearActiveOrderStore();
      setShowEndModal(true);
    }
  }, [activeOrder, createOrder, router]);

  const handleCancel = () => {
    cancelOrder();
    router.replace('/(customer)/(tabs)');
  };

  return (
    <ScreenContainer style={styles.root}>

      {/* ── Full-screen Map ─────────────────────────────────────────────── */}
      {Platform.OS === 'web' ? (
        <Image
          source={{ uri: 'https://placehold.co/800x800/EAECEE/002147?font=roboto&text=Map+Preview' }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{ ...coordinates, latitudeDelta: 0.018, longitudeDelta: 0.018 }}
        >
          <Marker coordinate={coordinates} title="موقعك" />
          {nearbyDrivers?.map(driver => (
            <Marker key={driver.id} coordinate={{ latitude: driver.lat, longitude: driver.lng }} title={`شاحنة`} iconType="truck" />
          ))}
        </MapView>
      )}

      {/* ── Top Location Bar ────────────────────────────────────────────── */}
      <Animated.View style={[styles.topBar, { top: insets.top + 12, opacity: fadeIn }]}>
        <View style={styles.locPill}>
          <Ionicons name="location" size={16} color={typeCfg.color} />
          <Text style={styles.locPillText} numberOfLines={1}>{locationName}</Text>
        </View>
      </Animated.View>

      {/* ── Bottom Sheet (Draggable) ─────────────── */}
      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + 20, opacity: fadeIn, transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >

        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Title */}
        <Text style={[styles.searchTitle, { marginTop: 16 }]}>جاري البحث عن أقرب سائق</Text>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map(i => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: dotAnim.interpolate({
                    inputRange: [i, i + 0.9, i + 1],
                    outputRange: [0.25, 1, 0.25],
                    extrapolate: 'clamp',
                  }),
                  transform: [{
                    translateY: dotAnim.interpolate({
                      inputRange: [i, i + 0.5, i + 1],
                      outputRange: [0, -5, 0],
                      extrapolate: 'clamp',
                    }),
                  }],
                },
              ]}
            />
          ))}
        </View>

        {/* Hidden Details Content */}
        <Animated.View style={{ opacity: translateY.interpolate({ inputRange: [0, HIDDEN_HEIGHT], outputRange: [1, 0] }) }}>
          {/* Order Info Card */}
          <View style={styles.orderCard}>
            <View style={[styles.orderIconWrap, { backgroundColor: typeCfg.color + '18' }]}>
              <MaterialCommunityIcons name={typeCfg.icon as any} size={24} color={typeCfg.color} />
            </View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderType}>{typeCfg.label}</Text>
              {!!quantity && <Text style={styles.orderQty}>{quantity}</Text>}
            </View>
            <View style={styles.orderStatusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusBadgeText}>قيد البحث</Text>
            </View>
          </View>

          {/* Tips row */}
          <View style={styles.tipRow}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.tipText}>عادةً ما يستغرق البحث من 1 إلى 3 دقائق</Text>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.85} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>إلغاء الطلب</Text>
          </TouchableOpacity>
        </Animated.View>

      </Animated.View>

      {/* ── End Modal (Expired or Cancelled) ────────────────────────────── */}
      <Modal visible={showEndModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: endModalType === 'expired' ? '#F59E0B' : '#10B981' }]}>
              <Ionicons 
                name={endModalType === 'expired' ? 'sad-outline' : 'checkmark-circle'} 
                size={44} 
                color={WHITE} 
              />
            </View>
            <Text style={styles.modalTitle}>{endModalType === 'expired' ? 'عذراً!' : 'تم الإلغاء'}</Text>
            <Text style={styles.modalMessage}>{endModalMsg}</Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              activeOpacity={0.85}
              onPress={() => {
                setShowEndModal(false);
                router.replace('/(customer)/(tabs)' as any);
              }}
            >
              <Text style={styles.modalButtonText}>العودة للرئيسية</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8EEF5' },

  // Top bar
  topBar: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: 20,
    zIndex: 10,
    alignItems: 'center',
  },
  locPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: width - 40,
  },
  locPillText: {
    fontSize: 14, fontFamily: 'Cairo-Bold', color: NAVY, flexShrink: 1,
  },

  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25,
    zIndex: 20,
  },
  handle: {
    width: 38, height: 4,
    backgroundColor: '#DDE3EC',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },

  // Radar
  radarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    marginBottom: 12,
  },
  radarCenter: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#E0E7FF',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  // Texts
  searchTitle: {
    fontSize: 20, fontFamily: 'Cairo-Bold',
    color: NAVY, textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 6, marginTop: 8, marginBottom: 20,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: NAVY,
  },

  // Order card
  orderCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    gap: 14,
  },
  orderIconWrap: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  orderInfo: { flex: 1, alignItems: 'flex-end' },
  orderType: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY },
  orderQty:  { fontSize: 13, fontFamily: 'Cairo-Regular', color: '#64748B', marginTop: 3 },
  orderStatusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  statusDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#F59E0B',
  },
  statusBadgeText: { fontSize: 11, fontFamily: 'Cairo-Bold', color: '#92400E' },

  // Tip
  tipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6, marginBottom: 20,
  },
  tipText: { fontSize: 12, fontFamily: 'Cairo-Regular', color: '#64748B' },

  // Cancel btn
  cancelBtn: {
    backgroundColor: YELLOW,
    height: 58, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: YELLOW,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelBtnText: { fontSize: 17, fontFamily: 'Cairo-Bold', color: NAVY },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(1, 32, 71, 0.7)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 25,
  },
  modalCard: {
    backgroundColor: WHITE,
    width: '100%', borderRadius: 28,
    padding: 30, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 15,
  },
  modalIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 24, fontFamily: 'Cairo-Bold', color: NAVY, marginBottom: 12 },
  modalMessage: { fontSize: 16, fontFamily: 'Cairo-Regular', color: '#64748B', textAlign: 'center', lineHeight: 26, marginBottom: 30 },
  modalButton: {
    backgroundColor: NAVY, width: '100%',
    height: 58, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  modalButtonText: { fontSize: 18, fontFamily: 'Cairo-Bold', color: WHITE },
});
