import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useCustomerStore } from '../../../src/store/useCustomerStore';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import ErrorBoundary from '../../../components/ErrorBoundary';
import * as Haptics from 'expo-haptics';
import ScreenContainer, { TAB_BAR_HEIGHT, MIN_BOTTOM_INSET } from '../../../components/ScreenContainer';

const { width } = Dimensions.get('window');

const AmmerliHomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Dynamic user name from AuthStore - defaults to 'زائر'
  const userProfile = useAuthStore((s) => s.userProfile);
  const userName = userProfile?.name ? userProfile.name.split(' ')[0] : 'زائر';

  // عدد الإشعارات غير المقروءة لإظهار النقطة الذهبية ديناميكياً
  const unreadCount = useCustomerStore((s) => s.notifications.filter((n) => !n.isRead).length);

  const { userLocation, setUserLocation, activeOrder } = useCustomerStore();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    if (!userLocation) {
      setShowPermissionModal(true);
    }
  }, [userLocation]);

  const requestLocationPermission = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        let address = undefined;
        try {
          const geocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          if (geocode.length > 0) {
            address = geocode[0].district || geocode[0].street || geocode[0].city || undefined;
          }
        } catch (e) {
          console.log('Geocoding error:', e);
        }
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address
        });
      }
    } catch (e) {
      console.log('Location error:', e);
    } finally {
      setIsFetchingLocation(false);
      setShowPermissionModal(false);
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

  const WaterCategory = ({ title, subtitle, imageSource, iconBg, onPress }: any) => (
    <TouchableOpacity 
      style={styles.categoryCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.imagePlaceholder, { backgroundColor: iconBg, borderRadius: 20 }]}>
         <Image source={imageSource} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
      </View>
      <Text style={styles.categoryTitle}>{title}</Text>
      <Text style={styles.categorySubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

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
                    {activeOrder.status === 'searching' ? 'جاري البحث عن سائق...' : 'تتبع طلبيتك الآن'}
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
            <TouchableOpacity style={styles.bannerContainer} onPress={() => router.push('/(customer)/tank-order-details?type=Spring')} activeOpacity={0.9}>
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
            </TouchableOpacity>
          )}

          {/* 3. Functional Water Selection Grid */}
          <View style={styles.sectionHeader}>
            <View />
            <Text style={styles.sectionTitle}>اختر نوع المياه</Text>
          </View>

          <View style={styles.gridContainer}>
            <WaterCategory 
              title="مياه الآبار" 
              subtitle="استخراج عميق" 
              imageSource={require('../../../assets/images/well-water-icon.png')}
              iconBg="#EFF6FF"
              onPress={() => handleServicePress('Well')}
            />
            <WaterCategory 
              title="مياه الينابيع" 
              subtitle="مصدر طبيعي" 
              imageSource={require('../../../assets/images/spring-water-icon.png')}
              iconBg="#F0F9FF"
              onPress={() => handleServicePress('Spring')}
            />
            <WaterCategory 
              title="مياه معبأة" 
              subtitle="عبوات مميزة" 
              imageSource={require('../../../assets/images/bottled_icon.png')}
              iconBg="#F0FDF4"
              onPress={() => handleServicePress('Bottled')}
            />
            <WaterCategory 
              title="أشغال" 
              subtitle="مياه غير صالحة للشرب" 
              imageSource={require('../../../assets/images/ashghal-icon.png')}
              iconBg="#FFF7ED"
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
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    marginBottom: 12 
  },
  sectionTitle: { fontSize: 20, fontFamily: 'Cairo-Bold', color: '#002147' },
  seeAllText: { color: '#8E8E93', fontFamily: 'Cairo-SemiBold' },

  gridContainer: { 
    flexDirection: 'row-reverse', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    width: (width - 52) / 2,
    height: 145,
    borderRadius: 22,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
  imagePlaceholder: { width: 80, height: 80, marginBottom: 6, justifyContent: 'center', alignItems: 'center' },
  categoryImage: { width: '100%', height: '100%' },
  categoryTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: '#002147', textAlign: 'center' },
  categorySubtitle: { fontSize: 12, color: '#8E8E93', fontFamily: 'Cairo-Regular', textAlign: 'center', marginTop: 4 },
  
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
