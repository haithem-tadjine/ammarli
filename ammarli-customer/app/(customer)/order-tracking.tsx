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
  Animated
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

export default function OrderTrackingScreen() {
  const router = useRouter();
  const userLocation = useCustomerStore(state => state.userLocation);
  const driverLocation = useCustomerStore(state => state.driverLocation);
  const setDriverLocation = useCustomerStore(state => state.setDriverLocation);
  const activeOrder = useCustomerStore(state => state.activeOrder);

  // Animation values
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const truckDriveAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.timing(truckDriveAnim, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, truckDriveAnim]);

  // Real driver info
  const driverInfo  = activeOrder?.driverInfo;
  const driverName  = driverInfo?.name  ?? 'جاري البحث عن سائق...';
  const phoneNumber = driverInfo?.phone  ?? '';
  const truckPlate  = driverInfo?.plate  ?? '---';
  const driverRating = driverInfo?.rating ?? '5.0';

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

  const coordinates = userLocation || { latitude: 35.5557, longitude: 6.1748 };
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
          {/* 
          <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
            <Feather name="help-circle" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          */}
        </View>

        {/* ── Map/Animation Card ─────────────────────────────────────────────── */}
        <View style={styles.mapContainer}>
          <View style={styles.animationWrapper}>
            {/* The Road */}
            <View style={styles.roadLine} />
            
            {/* Destination Pin */}
            <View style={styles.destinationWrap}>
              <Animated.View style={[styles.destinationPulse, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.destinationPin}>
                <Ionicons name="home" size={20} color={COLORS.white} />
              </View>
            </View>

            {/* The Truck */}
            <Animated.View 
              style={[
                styles.animatedTruckWrap,
                {
                  transform: [
                    {
                      translateX: truckDriveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [180, -120] // moving right to left
                      })
                    }, 
                    {
                      translateY: pulseAnim.interpolate({
                        inputRange: [1, 1.05],
                        outputRange: [15, 12] // align with road + slight bounce effect
                      })
                    }
                  ]
                }
              ]}
            >
              <MaterialCommunityIcons name="truck-fast" size={54} color={COLORS.primary} />
            </Animated.View>
          </View>

          {/* ETA Floating Badge */}
          <View style={styles.etaBadge}>
            <View style={styles.etaDot} />
            <Text style={styles.etaText}>
              {isSearching ? 'جاري البحث...' : '12 دقيقة للوصول'}
            </Text>
          </View>
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

        {/* ── Driver Card ────────────────────────────────────────────────────── */}
        {!isSearching && (
          <View style={styles.driverCard}>
            
            {/* Top Row: Avatar & Details */}
            <View style={styles.driverTopRow}>
              <View style={styles.driverInfoLeft}>
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
            </View>

            {/* Bottom Row: Actions */}
            <View style={styles.driverBottomRow}>
              {activeOrder?.price ? (
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>الإجمالي</Text>
                  <Text style={styles.priceValue}>{activeOrder.price.toLocaleString('ar-DZ')} د.ج</Text>
                </View>
              ) : <View style={{ flex: 1 }} />}

              <View style={styles.actionButtonsRow}>
                {/*
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => {}}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                */}
                <TouchableOpacity style={styles.callBtn} onPress={handleCallPress}>
                  <Ionicons name="call" size={20} color={COLORS.white} />
                  <Text style={styles.callBtnText}>اتصال</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        )}

        {/* ── Cancel Button ──────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelOrder}>
          <Text style={styles.cancelBtnText}>إلغاء الطلبية</Text>
        </TouchableOpacity>

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
  
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 320,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 5,
    position: 'relative',
  },
  animationWrapper: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: '#E8EEF5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  roadLine: {
    position: 'absolute',
    left: 40, right: 40,
    height: 1,
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    bottom: '40%',
  },
  destinationWrap: {
    position: 'absolute',
    left: 40,
    bottom: '40%',
    transform: [{ translateY: 20 }],
    zIndex: 2,
  },
  destinationPulse: {
    position: 'absolute',
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    top: -10, left: -10,
  },
  destinationPin: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.success,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  animatedTruckWrap: {
    position: 'absolute',
    bottom: '40%',
    zIndex: 1,
  },
  
  etaBadge: {
    position: 'absolute',
    bottom: -20,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  etaDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.secondary,
    marginLeft: 10,
  },
  etaText: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: COLORS.white,
  },

  statusSection: {
    alignItems: 'center',
    marginTop: 45,
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

  driverCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 3,
  },
  driverTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  driverInfoLeft: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 16,
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

  driverBottomRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: COLORS.success,
  },
  actionButtonsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
    gap: 8,
  },
  callBtnText: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: COLORS.white,
  },

  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: COLORS.danger,
  },
});
