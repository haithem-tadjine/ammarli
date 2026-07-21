import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
  AppState
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useCustomerStore } from '../../../src/store/useCustomerStore';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import ErrorBoundary from '../../../components/ErrorBoundary';
import ScreenContainer, { TAB_BAR_HEIGHT, MIN_BOTTOM_INSET } from '../../../components/ScreenContainer';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const WaterCategory = React.memo(({ title, subtitle, imageSource, onPress }: any) => (
  <TouchableOpacity 
    style={styles.categoryCardOuter} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.categoryCardInner}>
      <View style={styles.iconContainer}>
        <Image 
          source={imageSource} 
          style={styles.floatingImage} 
        />
      </View>
      <View style={styles.categoryTextContainer}>
        <Text style={styles.categoryTitle}>{title}</Text>
      </View>
    </View>
  </TouchableOpacity>
));

const AmmerliHomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isMounted = useRef(true);
  
  // Dynamic user name from AuthStore - defaults to 'زائر'
  const userProfile = useAuthStore((s) => s.userProfile);
  const userName = userProfile?.name ? userProfile.name.split(' ')[0] : 'زائر';

  const notifications = useCustomerStore((s) => s.notifications);

  // عدد الإشعارات غير المقروءة لإظهار النقطة الذهبية ديناميكياً
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const userLocation = useCustomerStore(state => state.userLocation);
  const setUserLocation = useCustomerStore(state => state.setUserLocation);
  const activeOrder = useCustomerStore(state => state.activeOrder);
  const fetchActiveOrder = useCustomerStore(state => state.fetchActiveOrder);
  
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    fetchActiveOrder();
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
         fetchActiveOrder();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (!userLocation) {
      setShowPermissionModal(true);
    }
    return () => {
      isMounted.current = false;
    };
  }, [userLocation]);

  const requestLocationPermission = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        
        if (isMounted.current) {
          // Immediately unblock the UI and set the location coordinates
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            address: undefined
          });
          setIsFetchingLocation(false);
          setShowPermissionModal(false);
        }

        // Perform reverse geocoding asynchronously in the background
        Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }).then((geocode) => {
          if (isMounted.current && geocode.length > 0) {
            const address = geocode[0].district || geocode[0].street || geocode[0].city || undefined;
            // Get the current location from store to preserve lat/lng
            const currentLocation = useCustomerStore.getState().userLocation;
            if (currentLocation) {
              setUserLocation({
                ...currentLocation,
                address
              });
            }
          }
        }).catch(e => {
          console.log('Geocoding error:', e);
        });

      } else {
        if (isMounted.current) {
          setIsFetchingLocation(false);
          setShowPermissionModal(false);
        }
      }
    } catch (e) {
      console.log('Location error:', e);
      if (isMounted.current) {
        setIsFetchingLocation(false);
        setShowPermissionModal(false);
      }
    }
  };

  // Navigation handlers
  const handleNotificationPress = () => {
    router.push('/(customer)/notifications' as any);
  };

  const handleServicePress = (serviceType: string) => {
    if (serviceType === 'Bottled') {
      router.push({ pathname: '/(customer)/order-details', params: { type: serviceType } } as any);
    } else {
      router.push({ pathname: '/(customer)/tank-order-details', params: { type: serviceType } } as any);
    }
  };

  const handleActiveOrderPress = () => {
    if (activeOrder?.status === 'searching' || activeOrder?.status === 'dispatched' || activeOrder?.status === 'created') {
      router.push('/(customer)/searching-driver');
    } else if (activeOrder?.status === 'arrived') {
      router.push('/(customer)/driver-arrived');
    } else if (activeOrder?.status === 'completed' || activeOrder?.status === 'delivered') {
      router.push('/(customer)/invoice');
    } else {
      router.push('/(customer)/order-tracking');
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case 'searching': return 'جاري البحث عن سائق...';
      case 'created': return 'تم إنشاء الطلب، جاري البحث...';
      case 'dispatched': return 'السائق في الطريق إليك';
      case 'accepted': return 'السائق في الطريق إليك';
      case 'arrived': return 'السائق وصل!';
      case 'delivering': return 'جاري التسليم';
      case 'completed': return 'تم التسليم بنجاح';
      case 'delivered': return 'تم التسليم بنجاح';
      default: return 'تتبع طلبيتك الآن';
    }
  };

  return (
    <ScreenContainer
      edges={['top']}
      backgroundColor="#FFFFFF"
      statusBarStyle="dark-content"
      statusBarColor="#FFFFFF"
    >
      <View style={styles.container}>
        {/* paddingBottom = ارتفاع الـ TabBar الفعلي + MIN_BOTTOM_INSET للحماية + 20 كفراغ إضافي */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, MIN_BOTTOM_INSET) + 20 }]}>
          
          {/* 1. Header with Dynamic Greeting and Notifications */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.notificationBtn} 
              onPress={handleNotificationPress}
            >
              <Feather name="bell" color="#002147" size={26} />
              {unreadCount > 0 && (
                <View style={styles.dot}>
                  {unreadCount > 1 && (
                    <Text style={styles.dotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.profileSection}>
              <View style={{ alignItems: 'flex-end', marginRight: 15 }}>
                <Text style={styles.greetingText}>مرحباً، {userName}</Text>
                {userLocation?.address && (
                   <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginTop: 2 }}>
                     <Text style={{ fontFamily: 'Cairo-SemiBold', fontSize: 13, color: '#002147', marginRight: 4 }}>
                       {userLocation.address}
                     </Text>
                     <Ionicons name="location" size={14} color="#FFCC00" />
                   </View>
                )}
              </View>
            </View>
          </View>

          {/* 2. Banner (Active Order or Promotional) */}
          {activeOrder && !['cancelled', 'delivered', 'expired'].includes(activeOrder.status) ? (
            <TouchableOpacity style={styles.bannerContainer} onPress={handleActiveOrderPress} activeOpacity={0.9}>
              <View style={[styles.bannerBackground, { backgroundColor: '#FFCC00' }]}>
                <View style={[styles.bannerTextContent, { alignItems: 'flex-start' }]}>
                  <Text style={[styles.bannerTitle, { color: '#002147' }]}>لديك طلب نشط</Text>
                  <Text style={[styles.bannerTitle, { color: '#002147', fontSize: 16, marginTop: 4 }]}>
                    {getOrderStatusText(activeOrder.status)}
                  </Text>
                  <View style={[styles.bannerButtonDecoration, { backgroundColor: '#002147' }]}>
                    <Text style={[styles.bannerButtonText, { color: '#FFF' }]}>عرض التفاصيل</Text>
                  </View>
                </View>
                <View style={styles.bannerImagePlaceholder}>
                  <Ionicons name="car" size={60} color="#002147" style={{ opacity: 0.8 }} />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.bannerContainer}>
              <View style={styles.bannerBackground}>
                <View style={styles.bannerTextContent}>
                  <Text style={styles.bannerTitle}>مياه نقية،</Text>
                  <Text style={styles.bannerTitle}>توصيل سريع</Text>
                  <View style={styles.bannerButtonDecoration}>
                    <Text style={styles.bannerButtonText}>اطلب الآن</Text>
                  </View>
                </View>
                <View style={styles.bannerImagePlaceholder} />
              </View>
            </View>
          )}

          {/* 3. Functional Water Selection Grid */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>اختر نوع المياه</Text>
          </View>

          <View style={styles.gridContainer}>
            <WaterCategory 
              title="مياه الآبار" 
              subtitle="استخراج عميق" 
              imageSource={require('../../../assets/images/well-water-icon.png')}
              onPress={() => handleServicePress('Well')}
            />
            <WaterCategory 
              title="مياه الينابيع" 
              subtitle="مصدر طبيعي" 
              imageSource={require('../../../assets/images/spring-water-icon.png')}
              onPress={() => handleServicePress('Spring')}
            />
            <WaterCategory 
              title="مياه معبأة" 
              subtitle="عبوات مميزة" 
              imageSource={require('../../../assets/images/bottled_icon.png')}
              onPress={() => handleServicePress('Bottled')}
            />
            <WaterCategory 
              title="أشغال" 
              subtitle="مياه غير صالحة للشرب" 
              imageSource={require('../../../assets/images/ashghal-icon.png')}
              onPress={() => handleServicePress('Ashghal')}
            />
          </View>

        </ScrollView>

      {/* Permission Modal */}
      <Modal
        visible={showPermissionModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="location" size={40} color="#002147" />
            </View>
            <Text style={styles.modalTitle}>تحديد الموقع</Text>
            <Text style={styles.modalText}>
              نحتاج إلى صلاحية الوصول لموقعك الجغرافي لتقديم خدمة توصيل سريعة ودقيقة.
            </Text>
            <TouchableOpacity 
              style={styles.allowButton} 
              onPress={requestLocationPermission}
              disabled={isFetchingLocation}
            >
              {isFetchingLocation ? (
                <ActivityIndicator color="#002147" />
              ) : (
                <Text style={styles.allowButtonText}>السماح بالوصول</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.denyButton} 
              onPress={() => setShowPermissionModal(false)}
            >
              <Text style={styles.denyButtonText}>ليس الآن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingTop: 6 },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  profileSection: { flexDirection: 'row-reverse', alignItems: 'center' },
  greetingText: { fontSize: 26, fontFamily: 'Cairo-Bold', color: '#002147' },
  notificationBtn: { padding: 8 },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  dotText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: 'Cairo-Bold',
    lineHeight: 12,
  },
  
  bannerContainer: { paddingHorizontal: 20, marginBottom: 15 },
  bannerBackground: {
    backgroundColor: '#002147',
    borderRadius: 22,
    height: 170,
    maxHeight: 170,
    flexDirection: 'row-reverse',
    padding: 20,
    overflow: 'hidden',
  },
  bannerTextContent: { flex: 1, justifyContent: 'center', alignItems: 'flex-end' },
  bannerTitle: { color: '#FFF', fontSize: 24, fontFamily: 'Cairo-Bold', textAlign: 'left' },
  bannerButtonDecoration: { 
    backgroundColor: '#FFCC00', 
    paddingHorizontal: 25, 
    paddingVertical: 10, 
    borderRadius: 20, 
    marginTop: 15 
  },
  bannerButtonText: { color: '#002147', fontFamily: 'Cairo-Bold', fontSize: 16 },
  bannerImagePlaceholder: { width: 100, height: 100 },

  sectionHeader: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'flex-start', // right aligned in RTL
    alignItems: 'center', 
    paddingHorizontal: 20, 
    marginBottom: 12 
  },
  sectionTitle: { fontSize: 24, fontFamily: 'Cairo-Bold', color: '#003366', textAlign: 'right' },
  seeAllText: { color: '#8E8E93', fontFamily: 'Cairo-SemiBold' },

  gridContainer: { 
    flexDirection: 'row-reverse', 
    flexWrap: 'wrap', 
    justifyContent: 'center', 
    paddingHorizontal: 20,
    gap: 20,
  },
  categoryCardOuter: {
    width: (width - 80) / 2,
    height: 120,
    borderRadius: 22,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: '#FFFFFF',
  },
  categoryCardInner: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 5,
  },
  floatingImage: {
    width: '120%',
    height: '120%',
    resizeMode: 'contain',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  categoryTextContainer: {
    alignItems: 'center',
  },
  categoryTitle: { 
    fontSize: 16, 
    fontFamily: 'Cairo-Bold', 
    color: '#003366', 
    textAlign: 'center' 
  },
  categorySubtitle: { 
    fontSize: 12, 
    color: '#64748B', 
    fontFamily: 'Cairo-Regular', 
    textAlign: 'center', 
    marginTop: 2 
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  modalIconContainer: {
    backgroundColor: '#FFCC00',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#002147',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  allowButton: {
    backgroundColor: '#FFCC00',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  allowButtonText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
    color: '#002147',
  },
  denyButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  denyButtonText: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 15,
    color: '#8E8E93',
  },
});

const WrappedHomeScreen = () => (
  <ErrorBoundary>
    <AmmerliHomeScreen />
  </ErrorBoundary>
);

export default WrappedHomeScreen;
