import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Animated,
  StatusBar,
  Linking
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { useCustomerStore } from '../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';
import ErrorBoundary from '../../components/ErrorBoundary';
import ScreenContainer, { MIN_BOTTOM_INSET } from '../../components/ScreenContainer';
import MapView, { Marker } from '../../components/Map';

const { width } = Dimensions.get('window');

const COLORS = {
  primaryBlue: '#003366', // Deep Navy
  accentYellow: '#F3CD0D', // Vibrant Yellow
  white: '#FFFFFF',
  background: '#F8FAFC',
  textDark: '#333333',
  textSecondary: '#64748B',
  border: '#E2E8F0',
};

const BOTTLE_PRICES: any = {
  '0.5L': 0,
  '1.5L': 0,
  '5L': 0,
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };
  
  const BRANDS = [
    { id: 'Guedila', name: 'قديلا', color: '#1A4C8A', logo: require('../../assets/images/brands/guedila.png') },
    { id: 'Ifri', name: 'إفري', color: '#0A829D', logo: require('../../assets/images/brands/ifri.png') },
    { id: 'Saida', name: 'سعيدة', color: '#E02020', logo: require('../../assets/images/brands/saida.png') },
    { id: 'Lalla', name: 'للا خديجة', color: '#27AE60', logo: require('../../assets/images/brands/lalla-khedidja.png') },
    { id: 'Mansourah', name: 'منصورة', color: '#8E44AD', logo: require('../../assets/images/brands/mansourah.png') },
    { id: 'Hayat', name: 'حياة', color: '#F39C12', logo: require('../../assets/images/brands/hayat.jpg') },
    { id: 'Messerghine', name: 'مسرغين', color: '#16A085', logo: require('../../assets/images/brands/messerghine.png') },
    { id: 'Texanna', name: 'تيكسانا', color: '#2980B9', logo: require('../../assets/images/brands/texanna.png') },
    { id: 'Toudja', name: 'توجة', color: '#C0392B', logo: require('../../assets/images/brands/toudja.png') },
    { id: 'Youkous', name: 'يوكوس', color: '#34495E', logo: require('../../assets/images/brands/youkous.png') },
  ];

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  
  // Dynamic cart state based on BRANDS array
  const [cart, setCart] = useState(() => {
    const initialCart: any = {};
    BRANDS.forEach(b => {
      initialCart[b.id] = { '0.5L': 0, '1.5L': 0, '5L': 0 };
    });
    return initialCart;
  });

  const totalQuantity = useMemo(() => {
    let total = 0;
    Object.keys(cart).forEach(brand => {
      const items = cart[brand];
      total += items['0.5L'] + items['1.5L'] + items['5L'];
    });
    return total;
  }, [cart]);

  const updateQuantity = useCallback((size: string, delta: number) => {
    if (!selectedBrand) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev: any) => {
      const currentQty = prev[selectedBrand][size];
      return {
        ...prev,
        [selectedBrand]: {
          ...prev[selectedBrand],
          [size]: Math.max(0, currentQty + delta)
        }
      };
    });
  }, [selectedBrand]);

  const handleMapPress = () => {
    router.push('/(customer)/location-picker');
  };

  const createOrder = useCustomerStore((s) => s.createOrder);
  const userLocation = useCustomerStore((s) => s.userLocation);
  const draftOrder = useCustomerStore((s) => s.draftOrder);

  const handleOrderNow = async () => {
    if (totalQuantity === 0) return; // Don't order if cart is empty
    
    const selectedLocation = draftOrder.location;
    
    if (!selectedLocation) {
      triggerShake();
      Alert.alert('تنبيه', 'يرجى تحديد موقع التوصيل أولاً');
      return;
    }
    
    const orderItems: any[] = [];
    Object.keys(cart).forEach(brand => {
      Object.keys(cart[brand]).forEach(size => {
        const qty = cart[brand][size];
        if (qty > 0) {
          orderItems.push({
            brand,
            size,
            qty,
          });
        }
      });
    });

    try {
      await createOrder({
        id: Math.floor(Math.random() * 100000),
        type: 'Bottled',
        status: 'searching',
        location: selectedLocation,
        locationName: selectedLocation.address || 'موقع التوصيل الحالي',
        items: orderItems,
      });
      router.push('/(customer)/searching-driver');
    } catch (e) {
      // Error handled by store/api interceptors
    }
  };

  const handleSchedule = () => {
    if (totalQuantity === 0) return;
    if (!draftOrder.location) {
      triggerShake();
      Alert.alert('تنبيه', 'يرجى تحديد موقع التوصيل أولاً');
      return;
    }
    let titleParts: string[] = [];
    Object.keys(cart).forEach(brand => {
      Object.keys(cart[brand]).forEach(size => {
        const qty = cart[brand][size];
        if (qty > 0) {
          titleParts.push(`${getBrandName(brand)} ${size} x${qty}`);
        }
      });
    });
    const title = titleParts.length > 0 ? titleParts.join(' | ') : "طلب مياه معبأة";

    router.push({
      pathname: '/(customer)/schedule-order',
      params: { orderTitle: title, isTanker: "false" }
    });
  };

  const getBrandName = (id: string | null) => {
    if (!id) return '';
    return BRANDS.find(b => b.id === id)?.name || id;
  };

  return (
    // ScreenContainer يتولى:
    // - paddingTop = insets.top (منطقة Status Bar)
    // - StatusBar مع الألوان الصحيحة
    // - edges=['top'] فقط لأن الـ Footer المطلق يتعامل مع الـ bottom بنفسه
    <ScreenContainer
      edges={['top']}
      backgroundColor={COLORS.primaryBlue}
      statusBarStyle="light-content"
      statusBarColor={COLORS.primaryBlue}
    >
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()}>
          <Ionicons name='chevron-back' size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>اطلب مياه معبأة</Text>
        <View style={styles.headerIcon} />
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, backgroundColor: COLORS.background }}
       keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 200 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          
          {/* Map Preview Section */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <TouchableOpacity style={styles.mapCard} activeOpacity={0.9} onPress={handleMapPress}>
              <View style={styles.mapImageContainer}>
                {Platform.OS === 'web' ? (
                  <Image 
                    source={{ uri: 'https://placehold.co/600x200/EAECEE/002147?font=roboto&text=Map+Preview' }}
                    style={styles.mapImage}
                    resizeMode="cover"
                  />
                ) : (
                  <MapView
                    style={styles.mapImage}
                    initialRegion={{
                      latitude: draftOrder.location?.latitude || userLocation?.latitude || 35.5557,
                      longitude: draftOrder.location?.longitude || userLocation?.longitude || 6.1748,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker 
                      coordinate={{
                        latitude: draftOrder.location?.latitude || userLocation?.latitude || 35.5557,
                        longitude: draftOrder.location?.longitude || userLocation?.longitude || 6.1748,
                      }} 
                    />
                  </MapView>
                )}
                <View style={styles.mapPinOverlay} pointerEvents="none">
                  <Ionicons name="location" size={40} color={COLORS.accentYellow} />
                </View>
              </View>
              <View style={styles.addressBar}>
                <Text style={styles.addressText}>{draftOrder.location?.address || 'حدد موقع التوصيل'}</Text>
                <Feather name="map" size={20} color={COLORS.primaryBlue} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Brand Selection */}
          <Text style={styles.sectionTitle}>اختر العلامة التجارية</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.brandScroll, { flexGrow: 1 }]}>
            {BRANDS.map((brand) => (
              <TouchableOpacity 
                key={brand.id}
                style={[styles.brandCard, selectedBrand === brand.id && styles.brandCardActive]}
                onPress={() => setSelectedBrand(brand.id)}
                activeOpacity={0.8}
              >
                {/* Badge for items in cart for this brand */}
                {Object.values(cart[brand.id] as Record<string, number>).reduce((a: number, b: number) => a + b, 0) > 0 && (
                  <View style={styles.brandBadge}>
                    <Text style={styles.brandBadgeText}>{Object.values(cart[brand.id] as Record<string, number>).reduce((a: number, b: number) => a + b, 0)}</Text>
                  </View>
                )}
                <View style={[styles.brandLogoCircle, { backgroundColor: brand.color + '15' }]}>
                  <Image source={brand.logo} style={{ width: 40, height: 40 }} resizeMode="contain" />
                </View>
                <Text style={styles.brandName}>{brand.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Size Selection for selected Brand */}
          {selectedBrand ? (
            <>
              <Text style={styles.sectionTitle}>اختر الأحجام لـ <Text style={{ color: COLORS.primaryBlue }}>{getBrandName(selectedBrand)}</Text></Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.sizesScroll, { flexGrow: 1 }]}>
                <ProductCard 
                  size="5L" 
                  label="عبوة 5 لتر" 
                  subLabel="قارورة واحدة" 
                  qty={cart[selectedBrand]['5L']} 
                  onAdd={() => updateQuantity('5L', 1)}
                  onSub={() => updateQuantity('5L', -1)}
                />
                <ProductCard 
                  size="1.5L" 
                  label="عبوة 1.5 لتر" 
                  subLabel="6 قارورات" 
                  qty={cart[selectedBrand]['1.5L']} 
                  onAdd={() => updateQuantity('1.5L', 1)}
                  onSub={() => updateQuantity('1.5L', -1)}
                />
                <ProductCard 
                  size="0.5L" 
                  label="عبوة 0.5 لتر" 
                  subLabel="12 قارورة" 
                  qty={cart[selectedBrand]['0.5L']} 
                  onAdd={() => updateQuantity('0.5L', 1)}
                  onSub={() => updateQuantity('0.5L', -1)}
                />
              </ScrollView>
            </>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, marginHorizontal: 20, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' }}>
              <Ionicons name="water-outline" size={48} color={COLORS.textSecondary} style={{ marginBottom: 10, opacity: 0.5 }} />
              <Text style={{ fontSize: 16, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, textAlign: 'center' }}>الرجاء اختيار العلامة التجارية أولاً لتحديد الكمية</Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer sticky bar */}
      {/* paddingBottom = Math.max(insets.bottom, MIN_BOTTOM_INSET) + 16
          صمام الأمان: إذا كان insets.bottom = 0 (Edge-to-Edge على بعض Android)
          يضمن MIN_BOTTOM_INSET وجود 16dp كحد أدنى فوق حافة الشاشة */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_INSET) + 16 }]}>
        <View style={[styles.footerInner, { justifyContent: 'center' }]}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.scheduleBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSchedule(); }}>
              <Text style={styles.scheduleBtnText}>جدولة</Text>
            </TouchableOpacity>
             <TouchableOpacity style={styles.orderBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleOrderNow(); }}>
              <Text style={styles.orderBtnText}>اطلب الآن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const ProductCard = React.memo(({ label, subLabel, qty, onAdd, onSub }: any) => (
  <View style={styles.productCard}>
    <View style={styles.productCardTop}>
      <View style={styles.productInfoRow}>
        <View style={styles.productInfo}>
          <Text style={styles.productLabel}>{label}</Text>
          <Text style={styles.productSubLabel}>{subLabel}</Text>
        </View>
        <View style={[styles.productImagePlaceholder, { backgroundColor: '#F0FDF4', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
           <Image source={require('../../assets/images/bottled_icon.png')} style={styles.productImage} resizeMode="contain" />
        </View>
      </View>
    </View>
    <View style={styles.stepperContainer}>
      <TouchableOpacity style={styles.stepperBtn} onPress={onSub} disabled={qty === 0}>
        <Feather name="minus" size={20} color={qty === 0 ? '#CBD5E1' : COLORS.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{qty}</Text>
      <TouchableOpacity style={styles.stepperBtn} onPress={onAdd}>
        <Feather name="plus" size={20} color={COLORS.primaryBlue} />
      </TouchableOpacity>
    </View>
  </View>
));
ProductCard.displayName = 'ProductCard';

const styles = StyleSheet.create({
  // safeArea لم تعد ضرورية — ScreenContainer يتعامل مع flex:1 والخلفية
  header: {
    height: 60,
    backgroundColor: COLORS.primaryBlue,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.white, flex: 1, textAlign: 'center' },
  scrollContent: {
    // paddingBottom is set dynamically via inline style using insets.bottom
  },
  
  // Map styles
  mapCard: {
    margin: 20,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
    overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  mapImageContainer: {
    height: 120,
    width: '100%',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  mapImage: { width: '100%', height: '100%' },
  mapPinOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  addressBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  addressText: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primaryBlue,
    marginRight: 8,
  },
  
  // Brands styles
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.textDark, textAlign: 'left', marginHorizontal: 20, marginTop: 10, marginBottom: 15 },
  brandScroll: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row-reverse' },
  brandCard: {
    width: 100,
    height: 110,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  brandCardActive: { borderColor: COLORS.accentYellow, borderWidth: 2 },
  brandBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.primaryBlue, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  brandBadgeText: { color: COLORS.white, fontSize: 11, fontFamily: 'Cairo-Bold' },
  brandLogoCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  brandLogoText: { fontSize: 18, fontFamily: 'Cairo-Bold', textAlign: 'center' },
  brandName: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.textDark },
  
  // Sizes styles
  sizesScroll: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row-reverse' },
  productCard: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginLeft: 15,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5,
    overflow: 'hidden',
  },
  productCardTop: { padding: 15 },
  productInfoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  productInfo: { flex: 1, alignItems: 'flex-end' },
  productLabel: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.textDark },
  productSubLabel: { fontSize: 11, fontFamily: 'Cairo-Regular', color: COLORS.textSecondary, marginTop: 2 },
  productPrice: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.primaryBlue, marginTop: 8 },
  productImagePlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F8FAFC', marginRight: 15, padding: 5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  productImage: { width: '100%', height: '100%' },
  stepperContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stepperBtn: { padding: 10 },
  stepperValue: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.textDark },

  // Footer styles
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20, paddingTop: 15,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    zIndex: 100,
  },
  footerInner: { gap: 15 },
  priceContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 13, fontFamily: 'Cairo-Regular', color: COLORS.textSecondary },
  priceValueWarning: { fontSize: 16, fontFamily: 'Cairo-Bold', color: '#D97706' },
  actionRow: { flexDirection: 'row-reverse', gap: 12 },
  orderBtn: { flex: 1.5, height: 55, backgroundColor: COLORS.accentYellow, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  orderBtnText: { fontSize: 17, fontFamily: 'Cairo-Bold', color: COLORS.primaryBlue },
  scheduleBtn: { flex: 1, height: 55, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.primaryBlue, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  scheduleBtnText: { fontSize: 17, fontFamily: 'Cairo-Bold', color: COLORS.primaryBlue },
});
