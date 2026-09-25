import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  Linking,
  ScrollView,
  Animated,
  BackHandler
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  surface: '#FFFFFF',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  success: '#10B981',
  successLight: '#ECFDF5'
};

// Water type config
const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  Bottled:  { label: 'مياه معبأة',    icon: 'bottle-soda-classic', color: '#0EA5E9' },
  Spring:   { label: 'مياه ينابيع',   icon: 'water',               color: '#0EA5E9' },
  Well:     { label: 'مياه آبار',     icon: 'water-pump',          color: '#7C3AED' },
  Ashghal:  { label: 'مياه أشغال',   icon: 'dump-truck',          color: '#EA580C' },
};

export default function OrderTrackingScreen() {
  const router = useRouter();
  const userLocation = useCustomerStore(state => state.userLocation);
  const driverLocation = useCustomerStore(state => state.driverLocation);
  const setDriverLocation = useCustomerStore(state => state.setDriverLocation);
  const activeOrder = useCustomerStore(state => state.activeOrder);

  // Real driver info
  const driverInfo  = activeOrder?.driverInfo;
  const driverName  = driverInfo?.name  ?? 'جاري البحث عن سائق...';
  const phoneNumber = driverInfo?.phone  ?? '';
  const truckPlate  = driverInfo?.plate  ?? '---';
  const driverRating = driverInfo?.rating ?? '5.0';

  const getWaterTypeKey = () => {
    const wt = (activeOrder?.waterType || activeOrder?.type || '').toLowerCase();
    if (wt.includes('spring') || wt.includes('ينابيع')) return 'Spring';
    if (wt.includes('well') || wt.includes('آبار')) return 'Well';
    if (wt.includes('construction') || wt.includes('ashghal') || wt.includes('بناء')) return 'Ashghal';
    if (wt.includes('tanker')) return 'Spring';
    return 'Bottled';
  };
  const typeCfg = TYPE_CONFIG[getWaterTypeKey()] || TYPE_CONFIG['Bottled'];
  // Use displayVolume (e.g., "1500 لتر") first; fall back to raw quantity
  const quantity = activeOrder?.displayVolume || (activeOrder?.quantity ? `${activeOrder.quantity} لتر` : '');

  const handleCallPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleCancelOrder = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/(customer)/cancel-order');
  };

  React.useEffect(() => {
    const handleLocationUpdate = (data: any) => {
      setDriverLocation({ latitude: data.lat, longitude: data.lng });
    };

    import('../../src/services/socket').then(({ socketService }) => {
      socketService.on('location_update', handleLocationUpdate);
    });

    return () => {
      import('../../src/services/socket').then(({ socketService }) => {
        socketService.off('location_update', handleLocationUpdate);
      });
    };
  }, [setDriverLocation]);

  React.useEffect(() => {
    const onBackPress = () => {
      router.replace('/(customer)/(tabs)');
      return true;
    };
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, []);

  React.useEffect(() => {
    if (!activeOrder) {
      router.replace('/(customer)/(tabs)' as any);
      return;
    }

    const status = activeOrder?.status;

    if (status === 'arrived') {
      const timeout = setTimeout(() => {
        router.replace('/(customer)/driver-arrived');
      }, 300);
      return () => clearTimeout(timeout);
    } else if (status === 'completed' || status === 'delivered') {
      router.replace('/(customer)/invoice');
    } else if (status === 'cancelled' || status === 'expired') {
      useCustomerStore.getState().clearActiveOrderStore();
      import('react-native').then(({ Alert }) => {
        Alert.alert('تنبيه', 'تم إلغاء الطلب من قبل السائق.', [
          { text: 'حسناً', onPress: () => router.replace('/(customer)/(tabs)' as any) }
        ]);
      });
    } else if (status === 'searching' || status === 'created') {
      router.replace('/(customer)/searching-driver');
    }
  }, [activeOrder, activeOrder?.status]);

  const coordinates = (activeOrder?.location?.latitude && activeOrder?.location?.longitude)
    ? activeOrder.location
    : (userLocation || { latitude: 35.5557, longitude: 6.1748 });
  const dCoordinates = driverLocation || { latitude: coordinates.latitude - 0.008, longitude: coordinates.longitude - 0.012 };
  
  const isSearching = activeOrder?.status === 'searching';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.replace('/(customer)/(tabs)')}>
            <Feather name="x" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تتبع الطلبية</Text>
          <View style={styles.iconBtn} />
        </View>

        {/* ── Status Text ────────────────────────────────────────────────────── */}
        <View style={styles.statusSection}>
          <Text style={styles.mainStatusText}>
            {isSearching ? 'نبحث عن سائق لك' : 'سائقك في الطريق'}
          </Text>
          <Text style={styles.subStatusText}>
            {isSearching 
              ? 'يرجى الانتظار، نقوم بتوجيه طلبك لأقرب شاحنة' 
              : 'السائق يتجه إلى موقعك الحالي، يرجى الاستعداد'}
          </Text>
        </View>

        {/* ── Top Card: Driver & Order Details ──────────────────────────────── */}
        {!isSearching && (
          <View style={styles.topCard}>
            {/* Top Row: Avatar & Driver Details */}
            <View style={styles.driverTopRow}>
              <View style={styles.avatarWrapper}>
                {driverInfo?.avatarUrl ? (
                  <Image source={{ uri: driverInfo.avatarUrl }} style={styles.driverAvatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetter}>{driverName.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.driverInfoRight}>
                <Text style={styles.driverName}>{driverName}</Text>
                <View style={styles.badgesRow}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color={COLORS.secondary} style={{ marginLeft: 4 }} />
                    <Text style={styles.ratingText}>{driverRating}</Text>
                  </View>
                  <View style={styles.plateBadge}>
                    <Text style={styles.plateText}>{truckPlate}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Middle Row: Order Details */}
            <View style={styles.orderDetailsRow}>
              <View style={styles.orderDetailItem}>
                <View style={[styles.orderIconWrap, { backgroundColor: typeCfg.color + '18' }]}>
                  <MaterialCommunityIcons name={typeCfg.icon as any} size={22} color={typeCfg.color} />
                </View>
                <View style={styles.orderTextWrapper}>
                  <Text style={styles.orderLabel}>النوع</Text>
                  <Text style={styles.orderValue}>{typeCfg.label}</Text>
                </View>
              </View>

              {!!quantity && (
                <View style={styles.orderDetailItem}>
                  <View style={[styles.orderIconWrap, { backgroundColor: COLORS.primary + '18' }]}>
                    <MaterialCommunityIcons name="water-percent" size={22} color={COLORS.primary} />
                  </View>
                  <View style={styles.orderTextWrapper}>
                    <Text style={styles.orderLabel}>الكمية</Text>
                    <Text style={styles.orderValue}>{quantity}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Bottom Row: Call Action */}
            <View style={styles.callActionWrapper}>
              <Text style={styles.etaCallText}>الموزع في طريقه لك، اتصل به</Text>
              <TouchableOpacity style={styles.callBtnPrimary} onPress={handleCallPress}>
                <Ionicons name="call" size={20} color={COLORS.white} />
                <Text style={styles.callBtnPrimaryText}>اتصال</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Bottom Section: Price & Cancel ─────────────────────────────────── */}
        <View style={styles.bottomSection}>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>الإجمالي المستحق</Text>
            <Text style={styles.priceValue}>
               {activeOrder?.price ? `${activeOrder.price.toLocaleString('ar-DZ')} د.ج` : '---'}
            </Text>
          </View>

          <TouchableOpacity style={styles.cancelBtnPrimary} onPress={handleCancelOrder}>
            <Text style={styles.cancelBtnPrimaryText}>إلغاء الطلبية</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  
  statusSection: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
  },
  mainStatusText: {
    fontSize: 24,
    fontFamily: 'Cairo-Black',
    color: COLORS.primary,
    marginBottom: 6,
  },
  subStatusText: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  topCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  driverTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  driverInfoRight: {
    marginRight: 16,
    alignItems: 'flex-end',
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'Cairo-Bold',
    color: '#D97706',
  },
  plateBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  plateText: {
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 24,
    fontFamily: 'Cairo-Black',
    color: '#4F46E5',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  orderDetailsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDetailItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },
  orderTextWrapper: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  orderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Cairo-SemiBold',
    marginBottom: 2,
  },
  orderValue: {
    fontSize: 15,
    color: COLORS.primary,
    fontFamily: 'Cairo-Bold',
  },
  callActionWrapper: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  etaCallText: {
    fontSize: 13,
    fontFamily: 'Cairo-Bold',
    color: COLORS.success,
    flex: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
  callBtnPrimary: {
    backgroundColor: COLORS.success,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  callBtnPrimaryText: {
    color: COLORS.white,
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
    marginRight: 8,
  },

  bottomSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  priceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  priceLabel: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
  },
  priceValue: {
    fontSize: 22,
    fontFamily: 'Cairo-Black',
    color: COLORS.success,
  },
  cancelBtnPrimary: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  cancelBtnPrimaryText: {
    color: COLORS.danger,
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
  },
});
