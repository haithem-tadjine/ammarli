import ScreenContainer from '../../components/ScreenContainer';
import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  Animated
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker } from '../../components/Map';
import { useCustomerStore } from '../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#012047',
  secondary: '#F3CD0D',
  white: '#FFFFFF',
  textSecondary: '#64748B',
  success: '#10B981',
  successLight: '#D1FAE5',
  background: '#F4F7FA',
};

export default function DriverArrivedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userLocation = useCustomerStore(state => state.userLocation);
  const activeOrder = useCustomerStore(state => state.activeOrder);

  // Pulse animation for the map marker
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  const handleIAmGoingOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace('/(customer)/invoice');
  };

  useEffect(() => {
    const status = activeOrder?.status;
    if (status === 'completed' || status === 'delivered') {
      router.replace('/(customer)/invoice');
    } else if (status === 'cancelled' || status === 'expired') {
      Alert.alert(
        'تنبيه', 
        status === 'expired' ? 'عذراً، لا يوجد سائقون متاحون حالياً وتم إلغاء الطلب.' : 'تم إلغاء الطلب بنجاح.',
        [{ text: 'حسناً', onPress: () => {
          useCustomerStore.getState().handleSocketOrderUpdate(null);
          router.replace('/(customer)/(tabs)');
        }}]
      );
    } else if (status === 'searching') {
      router.replace('/(customer)/searching-driver');
    }
  }, [activeOrder?.status, router]);

  const driverLocation = useCustomerStore(state => state.driverLocation);

  const coordinates = (activeOrder?.location?.latitude && activeOrder?.location?.longitude)
    ? activeOrder.location
    : (userLocation || { latitude: 35.5557, longitude: 6.1748 });

  // Driver is very close or at actual driver location
  const driverCoordinates = (driverLocation?.latitude && driverLocation?.longitude)
    ? driverLocation
    : { latitude: coordinates.latitude + 0.00015, longitude: coordinates.longitude + 0.00015 };

  const serviceName = activeOrder?.type === 'Bottled' ? 'مياه معبأة' : (activeOrder?.type === 'Well' ? 'مياه الآبار' : 'مياه الشرب');
  const driverInfo = activeOrder?.driverInfo;

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── Background Map ─────────────────────────────────────────────────── */}
      {Platform.OS === 'web' ? (
        <Image 
          source={{ uri: 'https://placehold.co/800x800/EAECEE/002147?font=roboto&text=Map+Preview' }}
          style={styles.map}
        />
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: (coordinates.latitude + driverCoordinates.latitude) / 2,
            longitude: (coordinates.longitude + driverCoordinates.longitude) / 2,
            latitudeDelta: 0.001,
            longitudeDelta: 0.001,
          }}
          scrollEnabled={false} zoomEnabled={false} pitchEnabled={false}
        >
          <Marker coordinate={coordinates}>
            <View style={styles.userPin}>
              <Ionicons name="location" size={20} color={COLORS.white} />
            </View>
          </Marker>

          <Marker coordinate={driverCoordinates}>
            <Animated.View style={[styles.driverPin, { transform: [{ scale: pulseAnim }] }]}>
              <MaterialCommunityIcons name="truck-fast" size={20} color={COLORS.primary} />
            </Animated.View>
          </Marker>
        </MapView>
      )}

      {/* Map Gradient Overlay */}
      <View style={styles.mapOverlayTop} pointerEvents="none" />

      {/* ── Bottom Sheet ───────────────────────────────────────────────────── */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
        <View style={styles.handle} />
        
        {/* Floating Success Banner */}
        <View style={styles.successBadge}>
           <View style={styles.successDot} />
           <Text style={styles.successBadgeText}>السائق في الخارج!</Text>
        </View>
        
        <Text style={styles.mainTitle}>يرجى الخروج لاستلام طلبك</Text>
        <Text style={styles.subTitle}>سائقك وصل وهو بانتظارك في الموقع المحدد</Text>

        {/* Order Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardIconWrap}>
             <Feather name="package" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.cardTextWrap}>
             <Text style={styles.cardLabel}>نوع الطلبية</Text>
             <Text style={styles.cardValue}>{serviceName}</Text>
          </View>
        </View>

        {/* Driver Details Card */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={styles.driverInfoRow}>
            <View style={styles.avatarWrapper}>
              {driverInfo?.avatarUrl ? (
                <Image source={{ uri: driverInfo.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{driverInfo?.name?.charAt(0) || 'S'}</Text>
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>

            <View style={styles.driverTextWrap}>
              <Text style={styles.driverName}>{driverInfo?.name || 'السائق'}</Text>
              <View style={styles.ratingRow}>
                 <Ionicons name="star" color={COLORS.secondary} size={14} style={{ marginLeft: 4 }} />
                 <Text style={styles.ratingScore}>{driverInfo?.rating || '4.9'}</Text>
                 <Text style={styles.ratingCount}> (سائق محترف)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.callCircle} onPress={() => Haptics.selectionAsync()}>
              <Ionicons name="call" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleIAmGoingOut} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>أنا خارج الآن</Text>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  map: { ...StyleSheet.absoluteFillObject },
  
  mapOverlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100,
    backgroundColor: 'rgba(255,255,255,0.2)', // Top gradient overlay
  },

  userPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  driverPin: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },

  bottomSheet: {
    position: 'absolute', bottom: 0, width: width,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingHorizontal: 20, paddingTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 25,
  },
  handle: { 
    width: 40, height: 5, backgroundColor: '#CBD5E1', 
    borderRadius: 3, alignSelf: 'center', marginBottom: 24 
  },
  
  successBadge: {
    backgroundColor: COLORS.successLight,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  successDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.success,
    marginLeft: 8,
  },
  successBadgeText: { color: COLORS.success, fontSize: 14, fontFamily: 'Cairo-Bold' },

  mainTitle: { 
    fontSize: 24, fontFamily: 'Cairo-Black', color: COLORS.primary, 
    textAlign: 'center', marginBottom: 4 
  },
  subTitle: { 
    fontSize: 14, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, 
    textAlign: 'center', marginBottom: 24 
  },

  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  
  cardIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 16,
  },
  cardTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cardLabel: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'Cairo-SemiBold' },
  cardValue: { color: COLORS.primary, fontSize: 16, fontFamily: 'Cairo-Bold', marginTop: 2 },

  driverInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
  },
  avatarWrapper: {
    position: 'relative',
    marginLeft: 16,
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { fontSize: 22, fontFamily: 'Cairo-Black', color: '#4F46E5' },
  onlineIndicator: { 
    position: 'absolute', bottom: 2, left: 2, 
    width: 14, height: 14, backgroundColor: COLORS.success, 
    borderRadius: 7, borderWidth: 2, borderColor: COLORS.white 
  },

  driverTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  driverName: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 2 },
  ratingScore: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  ratingCount: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold', marginRight: 4 },

  callCircle: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', alignItems: 'center', 
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  
  primaryBtn: {
    backgroundColor: COLORS.secondary,
    height: 60,
    borderRadius: 20,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary },
});
