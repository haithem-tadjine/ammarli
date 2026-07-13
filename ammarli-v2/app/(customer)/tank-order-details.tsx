import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  Animated,
  Keyboard
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCustomerStore } from '../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';
import ScreenContainer, { MIN_BOTTOM_INSET } from '../../components/ScreenContainer';
import MapView, { Marker } from '../../components/Map';

const { width } = Dimensions.get('window');

const COLORS = {
  primaryBlue: '#003366',
  accentYellow: '#F3CD0D',
  background: '#F8F9FA',
  textDark: '#333333',
  white: '#FFFFFF',
  gray: '#E0E0E0',
};

export default function TankDeliveryDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams(); // Well, Spring, Ashghal
  
  const [tankLocation, setTankLocation] = useState('أرضي');
  const [floor, setFloor] = useState(1); // Floor state
  const [quantity, setQuantity] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

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

  // Title depends on type
  const pageTitle = type === 'Well' ? 'طلب مياه الآبار' : type === 'Spring' ? 'طلب مياه الينابيع' : 'طلب مياه أشغال';

  const createOrder = useCustomerStore((s) => s.createOrder);
  const userLocation = useCustomerStore((s) => s.userLocation);
  const draftOrder = useCustomerStore((s) => s.draftOrder);

  const handleOrderNow = async () => {
    if (quantity <= 0) {
      triggerShake();
      Alert.alert('تنبيه', 'يرجى إدخال الكمية المطلوبة باللتر أولاً');
      return;
    }
    const selectedLocation = draftOrder.location;
    if (!selectedLocation) {
      triggerShake();
      Alert.alert('تنبيه', 'يرجى تحديد موقع التوصيل أولاً');
      return;
    }
    const orderData = {
      id: 'local-' + Math.floor(Math.random() * 100000),
      type: type as string,
      status: 'searching' as any,
      quantity: quantity.toString(),
      location: selectedLocation,
      locationName: selectedLocation.address || 'موقع التوصيل الحالي',
      items: [{
        brand: type === 'Well' ? 'مياه آبار' : type === 'Spring' ? 'مياه ينابيع' : 'مياه أشغال',
        size: `${quantity} لتر`,
        qty: 1,
        floor: type === 'Well' ? floor : undefined,
      }]
    };
    
    useCustomerStore.setState({ activeOrder: orderData });
    router.push('/(customer)/searching-driver');
  };

  return (
    // edges=['top']: ScreenContainer يتولى الـ top inset
    // الـ Footer المطلق يتعامل مع الـ bottom inset بنفسه بواسطة MIN_BOTTOM_INSET
    <ScreenContainer
      edges={['top']}
      backgroundColor={COLORS.primaryBlue}
      statusBarStyle="light-content"
      statusBarColor={COLORS.primaryBlue}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { zIndex: 10, elevation: 10 }]} 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(customer)/(tabs)' as any); // Fallback if no history
            }
          }}
        >
          <Ionicons name='chevron-back' size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, backgroundColor: COLORS.background }}
       keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 200 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Map Section */}
          <Animated.View style={[styles.mapContainer, { transform: [{ translateX: shakeAnim }] }]}>
            <TouchableOpacity style={styles.mapPlaceholder} activeOpacity={0.9} onPress={() => router.push('/(customer)/location-picker')}>
               {Platform.OS === 'web' ? (
                 <Image 
                   source={{ uri: 'https://placehold.co/600x300/EAECEE/002147?font=roboto&text=Map+Preview' }}
                   style={StyleSheet.absoluteFillObject}
                   resizeMode="cover"
                 />
               ) : (
                 <MapView
                   pointerEvents="none"
                   style={StyleSheet.absoluteFillObject}
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
               <View style={styles.mapOverlay} pointerEvents="none">
                 <Ionicons name="location" size={40} color={COLORS.primaryBlue} />
               </View>
            </TouchableOpacity>
            
            <View style={styles.locationCard}>
               <View style={styles.locationInfo}>
                  <Text style={styles.locationTitle}>{draftOrder.location ? 'موقع التوصيل' : 'حدد موقع التوصيل'}</Text>
                  <Text style={styles.locationSubtitle}>{draftOrder.location?.address || 'يرجى اختيار الموقع على الخريطة'}</Text>
               </View>
               <TouchableOpacity style={styles.editIconBtn}>
                  <Feather name="edit-2" size={20} color={COLORS.primaryBlue} />
               </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Tank Location Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>موقع الخزان</Text>
            <View 
              style={[styles.locationGrid, type === 'Spring' && { opacity: 0.4 }]}
              pointerEvents={type === 'Spring' ? 'none' : 'auto'}
            >
              <LocationOption 
                label="سطح المبنى" 
                iconName="business-outline" 
                selected={tankLocation === 'سطح'} 
                onPress={() => setTankLocation('سطح')} 
              />
              <LocationOption 
                label="تحت الأرض" 
                iconName="layers-outline" 
                selected={tankLocation === 'تحت'} 
                onPress={() => setTankLocation('تحت')} 
              />
              <LocationOption 
                label="أرضي" 
                iconName="home-outline" 
                selected={tankLocation === 'أرضي'} 
                onPress={() => setTankLocation('أرضي')} 
              />
            </View>
          </View>

          {/* Floor Selection (Only if Roof is selected) */}
          {tankLocation === 'سطح' && (
            <View style={[styles.section, { marginTop: 15 }]}>
              <Text style={styles.sectionTitle}>حدد رقم الطابق</Text>
              <View style={styles.quantityControl}>
                <TouchableOpacity 
                  style={[styles.qtyBtn, floor <= 1 && { backgroundColor: '#CBD5E1' }]} 
                  onPress={() => setFloor(prev => Math.max(1, prev - 1))}
                  disabled={floor <= 1}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>الطابق {floor}</Text>
                <TouchableOpacity 
                  style={styles.qtyBtn} 
                  onPress={() => setFloor(prev => prev + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quantity Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الكمية (لتر)</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity 
                style={[styles.qtyBtn, quantity <= 0 && { backgroundColor: '#CBD5E1' }]} 
                onPress={() => setQuantity(prev => Math.max(0, prev - 500))}
                disabled={quantity <= 0}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginHorizontal: 15 }}>
                <TextInput 
                  style={{ fontSize: 22, fontFamily: 'Cairo-Bold', color: COLORS.primaryBlue, padding: 0, minWidth: 60 }}
                  value={quantity.toString()}
                  onChangeText={(val: string) => {
                    let num = parseInt(val) || 0;
                    if (num > 20000) num = 20000;
                    setQuantity(num);
                  }}
                  keyboardType="numeric"
                  textAlign="center"
                  maxLength={5}
                />
                <Text style={{ fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primaryBlue, marginRight: 4 }}>لتر</Text>
              </View>
              <TouchableOpacity 
                style={[styles.qtyBtn, quantity >= 20000 && { backgroundColor: '#CBD5E1' }]} 
                onPress={() => setQuantity(prev => Math.min(20000, prev + 500))}
                disabled={quantity >= 20000}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Action Bar */}
      {!isKeyboardVisible && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_INSET) + 16, justifyContent: 'center' }]}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.scheduleBtn} onPress={() => { 
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
              if (!userLocation) {
                triggerShake();
                Alert.alert('تنبيه', 'يرجى تحديد موقع التوصيل أولاً');
                return;
              }
              const title = `${type === 'Well' ? 'مياه آبار' : type === 'Spring' ? 'مياه ينابيع' : 'مياه أشغال'} ${quantity} لتر`;
              router.push({
                pathname: '/(customer)/schedule-order',
                params: { orderTitle: title, isTanker: "true" }
              });
            }}>
              <Text style={styles.scheduleBtnText}>جدولة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.orderBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleOrderNow(); }}>
              <Text style={styles.orderBtnText}>اطلب الآن</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const LocationOption = React.memo(({ label, iconName, selected, onPress }: any) => (
  <TouchableOpacity 
    style={[styles.locationOption, selected && styles.selectedOption]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons 
      name={iconName} 
      size={32} 
      color={selected ? COLORS.primaryBlue : '#8E8E93'} 
      style={{ marginBottom: 8 }} 
    />
    <Text style={[styles.optionLabel, selected && styles.selectedOptionText]}>{label}</Text>
  </TouchableOpacity>
));
LocationOption.displayName = 'LocationOption';

const styles = StyleSheet.create({
  // safeArea لم تعد ضرورية — ScreenContainer يتعامل مع flex:1 والخلفية
  header: {
    backgroundColor: COLORS.primaryBlue,
    height: 60,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    flex: 1,
    textAlign: 'center',
    marginRight: -30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    // paddingBottom is set dynamically via inline style using insets.bottom
  },
  mapContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: COLORS.gray,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  locationCard: {
    backgroundColor: COLORS.white,
    marginTop: -25,
    marginHorizontal: 10,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primaryBlue,
  },
  locationSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#888',
    marginTop: 4,
  },
  editIconBtn: {
    padding: 8,
  },
  section: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    textAlign: 'left',
    color: COLORS.textDark,
    marginBottom: 15,
  },
  locationGrid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  locationOption: {
    width: (width - 60) / 3,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedOption: {
    borderColor: COLORS.accentYellow,
    borderWidth: 2,
    backgroundColor: '#FFFBEA',
  },
  optionLabel: {
    fontSize: 13,
    fontFamily: 'Cairo-Bold',
    color: '#8E8E93',
  },
  selectedOptionText: {
    color: COLORS.primaryBlue,
  },
  quantityControl: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    color: COLORS.white,
    fontSize: 24,
    fontFamily: 'Cairo-Bold',
    marginTop: -2,
  },
  quantityText: {
    fontSize: 26,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primaryBlue,
    marginHorizontal: 30,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    zIndex: 100,
    // paddingBottom is set dynamically via inline style using insets.bottom
  },
  priceInfo: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    color: COLORS.textDark,
    fontFamily: 'Cairo-Bold',
  },
  priceValue: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primaryBlue,
  },
  priceValueWarning: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#D97706',
  },
  taxNote: {
    textAlign: 'left',
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row-reverse',
    marginTop: 20,
    gap: 12,
  },
  orderBtn: {
    flex: 1.5,
    backgroundColor: COLORS.accentYellow,
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
  },
  scheduleBtn: {
    flex: 1,
    height: 55,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleBtnText: {
    color: COLORS.primaryBlue,
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
  },
});
