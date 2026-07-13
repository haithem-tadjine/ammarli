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
  ScrollView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from '../../components/Map';
import { useCustomerStore } from '../../src/store/useCustomerStore';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#002147', // Deep Navy Blue
  secondary: '#FFCC00', // Vibrant Yellow
  white: '#FFFFFF',
  background: '#F8F9FA',
  textSecondary: '#8E8E93',
  lightYellow: '#FFFBEA',
};

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { userLocation, driverLocation, setDriverLocation, activeOrder } = useCustomerStore();

  // Real driver info — populated when socket fires request_accepted
  const driverInfo  = activeOrder?.driverInfo;
  const driverName  = driverInfo?.name  ?? 'جاري البحث...';
  const phoneNumber = driverInfo?.phone  ?? '';
  const truckPlate  = driverInfo?.plate  ?? '---';
  const driverRating = driverInfo?.rating ?? '---';

  const handleCallPress = () => {
    if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleCancelOrder = () => {
    router.push('/(customer)/cancel-order');
  };

  React.useEffect(() => {
    import('../../src/services/socket').then(({ socketService }) => {
      // The connection is handled globally in _layout.tsx, we just listen here.
      socketService.on('location_update', (data) => {
        setDriverLocation({ latitude: data.lat, longitude: data.lng });
      });
    });

    return () => {
      import('../../src/services/socket').then(({ socketService }) => {
        socketService.off('location_update');
      });
    };
  }, []);

  React.useEffect(() => {
    if (!activeOrder) {
      console.log('No active order found, kicking out to home...');
      router.replace('/(customer)/(tabs)' as any);
      return;
    }

    const status = activeOrder?.status;
    console.log('Current tracking status:', status);

    if (status === 'arrived') {
      console.log('Attempting to navigate to driver-arrived...');
      const timeout = setTimeout(() => {
        router.replace('/(customer)/driver-arrived');
      }, 300);
      return () => clearTimeout(timeout);
    } else if (status === 'completed' || status === 'delivered') {
      router.replace('/(customer)/invoice');
    } else if (status === 'cancelled' || status === 'expired') {
      useCustomerStore.getState().clearActiveOrderStore();
      import('react-native').then(({ Alert }) => {
        Alert.alert('تنبيه', 'The driver had to cancel the order.', [
          {
            text: 'حسناً',
            onPress: () => {
              router.replace('/(customer)/(tabs)' as any);
            }
          }
        ]);
      });
    } else if (status === 'searching' || status === 'dispatched' || status === 'created') {
      // If backend is still trying to dispatch, customer should stay on the searching screen
      router.replace('/(customer)/searching-driver');
    }
  }, [activeOrder, activeOrder?.status]);

  const coordinates = userLocation || { latitude: 35.5557, longitude: 6.1748 };
  const dCoordinates = driverLocation || { latitude: coordinates.latitude - 0.008, longitude: coordinates.longitude - 0.012 };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={styles.headerTitle}>حالة الطلب</Text>
          <View style={{ width: 44 }} /> 
        </View>

        {/* ETA Badge */}
        <View style={styles.etaContainer}>
          <View style={styles.etaCard}>
            <Text style={styles.etaText}>
              {activeOrder?.status === 'searching' ? 'البحث مستمر...' : 'السائق في الطريق'}
            </Text>
            <View style={styles.etaIconCircle}>
              <MaterialCommunityIcons 
                name={activeOrder?.status === 'searching' ? "radar" : "truck-delivery"} 
                size={24} 
                color={COLORS.primary} 
              />
            </View>
          </View>
        </View>

        {/* Map Card */}
        <View style={styles.mapCard}>
          {Platform.OS === 'web' ? (
            <Image 
              source={{ uri: 'https://placehold.co/800x600/EAECEE/002147?font=roboto&text=Route+Map%0A(Use+Mobile+App+for+Live+Tracking)' }}
              style={styles.mapImage}
            />
          ) : (
            <MapView
              style={styles.mapImage}
              initialRegion={{
                latitude: (coordinates.latitude + dCoordinates.latitude) / 2,
                longitude: (coordinates.longitude + dCoordinates.longitude) / 2,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Polyline 
                coordinates={[dCoordinates, coordinates]}
                strokeColor="#1E88E5"
                strokeWidth={5}
              />
              
              {/* User Location */}
              <Marker coordinate={coordinates} title="موقعك" />

              {/* Driver Location */}
              <Marker coordinate={dCoordinates} title="موقع السائق" iconType="truck" />
            </MapView>
          )}
        </View>

        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <Text style={styles.mainStatusText}>
            {activeOrder?.status === 'searching' ? 'جاري البحث عن سائق آخر...' : 'في الطريق إليك'}
          </Text>
          <Text style={styles.subStatusText}>
            {activeOrder?.status === 'searching' 
              ? 'يرجى الانتظار، نقوم بتوجيه طلبك لأقرب سائق متاح' 
              : activeOrder?.status === 'accepted' 
                ? 'السائق يقوم بتحديد السعر وسيتم انطلاقه قريباً' 
                : 'السائق يتجه إلى موقعك الحالي'}
          </Text>
        </View>

        {/* Driver Info Card */}
        {activeOrder?.status !== 'searching' && (
          <View style={styles.driverCard}>
            <TouchableOpacity style={styles.callButton} onPress={handleCallPress}>
              <Ionicons name="call" size={22} color={COLORS.white} />
              <Text style={styles.callButtonText}>اتصال</Text>
            </TouchableOpacity>

            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driverName}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingText}>{driverRating}</Text>
                <Ionicons name="star" size={14} color={COLORS.secondary} />
              </View>
              <Text style={styles.plateText}>رقم اللوحة: {truckPlate}</Text>
              {activeOrder?.price ? (
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>السعر النهائي: {activeOrder.price.toLocaleString('ar-DZ')} د.ج</Text>
                </View>
              ) : null}
            </View>
            
            {driverInfo?.avatarUrl ? (
              <Image source={{ uri: driverInfo.avatarUrl }} style={styles.driverAvatar} />
            ) : (
              <View style={[styles.driverAvatar, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person" size={30} color="#fff" />
              </View>
            )}
          </View>
        )}

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
          <Text style={styles.cancelButtonText}>إلغاء الطلب</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  etaContainer: {
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  etaCard: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.lightYellow,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#FBEB98',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  etaText: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
    marginLeft: 15,
  },
  etaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  mapCard: {
    marginHorizontal: 20,
    marginTop: 25,
    height: 250,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  userPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E88E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  userPinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  driverPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },

  statusContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  mainStatusText: {
    fontSize: 26,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subStatusText: {
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  driverCard: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  driverInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 15,
  },
  driverName: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  priceBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#16A34A',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  plateText: {
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
  },
  callButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#1E88E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    elevation: 3,
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  callButtonText: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: 'Cairo-Bold',
    marginTop: 4,
  },
  cancelButton: {
    height: 56,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#EF4444',
  },
});
