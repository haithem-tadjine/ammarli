import ScreenContainer from '../../components/ScreenContainer';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
  TextInput,
  Animated,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AmmarliInput from '../../components/AmmarliInput';
import { useDriverStore } from '../../src/store/useDriverStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { api } from '../../src/services/api';

const { width } = Dimensions.get('window');

const COLORS = {
  primary:   '#012047',
  secondary: '#F3CD0D',
  white:     '#FFFFFF',
  textGray:  '#64748B',
  border:    '#E2E8F0',
};

// ─── جميع العلامات التجارية ───────────────────────────────────────────────────

const ALL_BRANDS = [
  { id: 'Ifri',          name: 'Ifri',          logo: require('../../assets/images/brands/ifri.png')           },
  { id: 'Guedila',       name: 'Guedila',       logo: require('../../assets/images/brands/guedila.png')        },
  { id: 'Saida',         name: 'Saida',         logo: require('../../assets/images/brands/saida.png')          },
  { id: 'Lalla Khedidja',name: 'L.Khedidja',   logo: require('../../assets/images/brands/lalla-khedidja.png') },
  { id: 'Mansourah',     name: 'Mansourah',     logo: require('../../assets/images/brands/mansourah.png')      },
  { id: 'Toudja',        name: 'Toudja',        logo: require('../../assets/images/brands/toudja.png')         },
  { id: 'Youkous',       name: 'Youkous',       logo: require('../../assets/images/brands/youkous.png')        },
  { id: 'Messerghine',   name: 'Messerghine',   logo: require('../../assets/images/brands/messerghine.png')    },
  { id: 'Texanna',       name: 'Texanna',       logo: require('../../assets/images/brands/texanna.png')        },
  { id: 'Hayat',         name: 'Hayat',         logo: require('../../assets/images/brands/hayat.jpg')          },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** بطاقة اختيار نوع المركبة — تدعم صورة أو أيقونة */
const VehicleCard = ({ title, iconName, imageSource, active, onPress }: any) => (
  <TouchableOpacity
    style={[styles.selectionCard, active && styles.selectionCardActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {imageSource ? (
      <Image source={imageSource} style={{ width: 50, height: 50, marginBottom: 4 }} resizeMode="contain" />
    ) : (
      <MaterialCommunityIcons name={iconName} size={42} color={active ? COLORS.primary : COLORS.textGray} style={{ marginBottom: 4 }} />
    )}
    <Text style={[styles.selectionTitle, active && styles.selectionTitleActive]}>{title}</Text>
  </TouchableOpacity>
);

/** بطاقة اختيار نوع المياه — صورة + نص */
const TypeChip = ({ label, iconName, imageSource, active, onPress }: any) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {imageSource ? (
      <Image source={imageSource} style={{ width: 44, height: 44, marginBottom: 4 }} resizeMode="contain" />
    ) : (
      <MaterialCommunityIcons name={iconName} size={38} color={active ? COLORS.primary : COLORS.textGray} style={{ marginBottom: 4 }} />
    )}
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

const DriverRegistrationScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const [vehicleType, setVehicleType] = useState<'tanker' | 'bottled'>('tanker');
  const [waterType,   setWaterType]   = useState('spring');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [capacity,    setCapacity]    = useState('5000');

  // أسعار القوارير لسائق المياه المعبأة
  const [price05, setPrice05] = useState('');
  const [price15, setPrice15] = useState('');
  const [price5,  setPrice5]  = useState('');

  const [fullName,  setFullName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [phoneErr,  setPhoneErr]  = useState('');
  const [password,  setPassword]  = useState('');
  const [license,   setLicense]   = useState('');

  const phoneRef    = useRef<TextInput>(null);
  const passRef     = useRef<TextInput>(null);
  const licenseRef  = useRef<TextInput>(null);
  const capacityRef = useRef<TextInput>(null);

  const registerDriver = useDriverStore(s => s.registerDriver);

  const toggleBrand = (id: string) => {
    setSelectedBrands(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !phone.trim() || !password.trim() || !license.trim()) {
      Alert.alert('بيانات ناقصة', 'يرجى تعبئة جميع الحقول قبل المتابعة.');
      shake();
      return;
    }
    if (vehicleType === 'bottled') {
      if (selectedBrands.length === 0) {
        Alert.alert('اختر علامة تجارية', 'يرجى اختيار علامة تجارية واحدة على الأقل.');
        shake();
        return;
      }
      const p05 = parseFloat(price05);
      const p15 = parseFloat(price15);
      const p5  = parseFloat(price5);
      if (isNaN(p05) || p05 <= 0 || isNaN(p15) || p15 <= 0 || isNaN(p5) || p5 <= 0) {
        Alert.alert('تحديد الأسعار مطلوب', 'يرجى إدخال أسعار صحيحة لجميع أحجام العبوات (0.5L، 1.5L، 5L).');
        shake();
        return;
      }
    }

    setLoading(true);
    try {
      const p05 = parseFloat(price05);
      const p15 = parseFloat(price15);
      const p5  = parseFloat(price5);
      const bottledPrices = vehicleType === 'bottled' && !isNaN(p05) && !isNaN(p15) && !isNaN(p5)
        ? { '0.5L': p05, '1.5L': p15, '5L': p5 }
        : undefined;

      await useAuthStore.getState().register({
        phone: phone.trim(),
        firstName: fullName.trim().split(' ')[0],
        lastName: fullName.trim().split(' ').slice(1).join(' ') || ' ',
        password: password,
        role: 'DRIVER',
        driverType: vehicleType === 'bottled' ? 'BOTTLED' : 'TANKER',
        truckPlate: license.trim(),
        waterType: vehicleType === 'tanker' ? waterType : undefined,
        brands: vehicleType === 'bottled' ? selectedBrands : undefined,
        capacity: vehicleType === 'tanker' ? Number(capacity) : undefined,
        bottledPrices,
      });

      // الدخول التلقائي سيغير الـ state 
      // نقوم بتوجيه السائق مباشرة إلى التطبيق
      router.replace('/(driver)/(tabs)' as any);
    } catch (e: any) {
      const status = e?.response?.status;
      const errCode = e?.response?.data?.response?.errorCode;
      if (errCode === 'user.error.phone_exists') {
        setPhoneErr('PHONE_EXISTS');
        Alert.alert('تنبيه', 'عذراً، هذا الرقم مرتبط بحساب آخر. يرجى استخدام رقم مختلف أو تسجيل الدخول.');
        shake();
        return;
      }
      
      if (status >= 500) {
        Alert.alert('خطأ في النظام', 'عذراً، حدث خطأ في النظام. يرجى المحاولة لاحقاً.');
      } else {
        let errMsg = 'فشل التسجيل. تأكد من البيانات.';
        if (e?.response?.data?.message) {
          errMsg = Array.isArray(e.response.data.message)
            ? e.response.data.message[0]
            : e.response.data.message;
        }
        Alert.alert('خطأ في التسجيل', errMsg);
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── محتوى النموذج المشترك ────────────────────────────────────────────────
  const FormContent = (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      {/* المعلومات الأساسية */}
      <View style={styles.formSection}>
        <AmmarliInput label="الاسم الكامل"        placeholder="أدخل اسمك الكامل"            iconName="person-outline"      value={fullName}  onChangeText={setFullName} />
        <AmmarliInput label="رقم الهاتف"          placeholder="05XX XXX XXX"                iconName="call-outline"        value={phone}     onChangeText={(t) => { setPhone(t); setPhoneErr(''); }}    keyboardType="phone-pad" error={phoneErr !== 'PHONE_EXISTS' && phoneErr !== '' ? phoneErr : undefined} />
        {phoneErr === 'PHONE_EXISTS' && (
          <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#E53935', marginTop: -15, marginBottom: 15, textAlign: 'right' }}>
            رقم الهاتف المدخل مستخدم بالفعل. هل تريد <Text style={{fontWeight: 'bold', textDecorationLine: 'underline'}} onPress={() => router.replace('/(driver)/login' as any)}>تسجيل الدخول</Text> بدلاً من ذلك؟
          </Text>
        )}
        <AmmarliInput label="كلمة المرور"         placeholder="أدخل كلمة المرور"            iconName="lock-closed-outline" value={password}  onChangeText={setPassword} secureTextEntry isPassword />
        <AmmarliInput label="رقم لوحة الترخيص"   placeholder="رقم اللوحة (مثلاً: 12345-120-05)" iconName="card-outline"   value={license}   onChangeText={setLicense} />
      </View>

      {/* اختيار نوع المركبة */}
      <Text style={styles.sectionLabel}>فئة المركبة</Text>
      <View style={styles.row}>
        <VehicleCard
          title="توصيل عبوات"
          imageSource={require('../../assets/images/bottled_icon.png')}
          active={vehicleType === 'bottled'}
          onPress={() => setVehicleType('bottled')}
        />
        <VehicleCard
          title="شاحنة صهريج"
          imageSource={require('../../assets/images/traker.png')}
          active={vehicleType === 'tanker'}
          onPress={() => setVehicleType('tanker')}
        />
      </View>

      {/* ── قسم العبوات: اختيار العلامات التجارية ── */}
      {vehicleType === 'bottled' && (
        <View style={styles.dynamicSection}>
          <Text style={styles.sectionLabel}>
            اختر العلامات التجارية المتوفرة لديك
          </Text>
          {selectedBrands.length > 0 && (
            <Text style={styles.selectedCount}>
              {selectedBrands.length} علامة مختارة
            </Text>
          )}
          <View style={styles.brandGrid}>
            {ALL_BRANDS.map(brand => {
              const active = selectedBrands.includes(brand.id);
              return (
                <TouchableOpacity
                  key={brand.id}
                  style={[styles.brandCard, active && styles.brandCardActive]}
                  onPress={() => toggleBrand(brand.id)}
                  activeOpacity={0.75}
                >
                  <Image source={brand.logo} style={styles.brandLogo} resizeMode="contain" />
                  <Text style={[styles.brandName, active && styles.brandNameActive]}>
                    {brand.name}
                  </Text>
                  {active && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* أسعار بيع العبوات */}
          <Text style={styles.sectionLabel}>أسعار بيع العبوات (د.ج)</Text>
          <Text style={styles.sectionSublabel}>
            يرجى تحديد سعر البيع لكل حجم لحساب تكلفة الطلبات تلقائياً
          </Text>
          <View style={styles.pricingRow}>
            <View style={styles.priceCol}>
              <Text style={styles.priceColTitle}>فاردو 0.5L</Text>
              <View style={styles.priceInputWrap}>
                <TextInput
                  style={styles.priceTextInput}
                  placeholder="150"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={price05}
                  onChangeText={setPrice05}
                />
                <Text style={styles.priceCurrency}>د.ج</Text>
              </View>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.priceColTitle}>فاردو 1.5L</Text>
              <View style={styles.priceInputWrap}>
                <TextInput
                  style={styles.priceTextInput}
                  placeholder="200"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={price15}
                  onChangeText={setPrice15}
                />
                <Text style={styles.priceCurrency}>د.ج</Text>
              </View>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.priceColTitle}>قارورة 5L</Text>
              <View style={styles.priceInputWrap}>
                <TextInput
                  style={styles.priceTextInput}
                  placeholder="90"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={price5}
                  onChangeText={setPrice5}
                />
                <Text style={styles.priceCurrency}>د.ج</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── قسم الصهريج: نوع المياه والسعة ── */}
      {vehicleType === 'tanker' && (
        <View style={styles.dynamicSection}>
          <Text style={styles.sectionLabel}>نوع المياه</Text>
          <View style={styles.waterTypeRow}>
            <TypeChip
              label="مياه بناء"
              imageSource={require('../../assets/images/ashghal-icon.png')}
              active={waterType === 'construction'}
              onPress={() => setWaterType('construction')}
            />
            <TypeChip
              label="مياه آبار"
              imageSource={require('../../assets/images/well-water-icon.png')}
              active={waterType === 'well'}
              onPress={() => setWaterType('well')}
            />
            <TypeChip
              label="الينابيع"
              imageSource={require('../../assets/images/spring-water-icon.png')}
              active={waterType === 'spring'}
              onPress={() => setWaterType('spring')}
            />
          </View>
          <View style={{ marginTop: 20 }}>
            <AmmarliInput
              label="سعة الخزان (لتر)"
              placeholder="5000"
              iconName="water-outline"
              keyboardType="numeric"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>
        </View>
      )}

      {/* زر الإنشاء */}
      <TouchableOpacity 
        style={[styles.submitButton, loading && { opacity: 0.75 }]} 
        activeOpacity={0.8} 
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>إنشاء حساب جديد</Text>
            <Ionicons name='arrow-back' size={22} color={COLORS.primary} style={{ marginStart: 12 }} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/(driver)/login')}>
        <Text style={styles.footerText}>
          لديك حساب بالفعل؟{' '}
          <Text style={styles.footerBold}>تسجيل الدخول</Text>
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />

      {/* ── Navy Header with Logo ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.absoluteBack} onPress={() => router.back()}>
          <Ionicons name='chevron-forward' size={28} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.logoWrapper}>
          <Image source={require('../../assets/images/logo.png')} style={{width: 60, height: 60, marginBottom: 5}} resizeMode="contain" />
          <Text style={styles.logoBrandName}>AMMARLI</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>تسجيل حساب سائق</Text>
            {FormContent}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.primary },
  
  // Header / Logo
  header:      { height: Dimensions.get('window').height * 0.15, justifyContent: 'center', alignItems: 'center', marginTop: Platform.OS === 'android' ? 20 : 0 },
  logoWrapper: { alignItems: 'center' },
  logoBrandName: {
    fontSize: 24, fontWeight: '900', color: COLORS.white,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-black',
  },
  absoluteBack: { position: 'absolute', top: 20, right: 20, zIndex: 10, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  // Scroll / Card
  scrollContent: { paddingHorizontal: 20, paddingBottom: 160, flexGrow: 1 },
  formCard: {
    backgroundColor: COLORS.white, borderRadius: 35, padding: 25, width: '100%',
    elevation: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 25,
  },
  cardHeaderTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, textAlign: 'center', marginBottom: 20, fontFamily: 'Cairo-Bold' },

  formSection:  { marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginBottom: 8, textAlign: 'left', marginTop: 15 },
  sectionSublabel: { fontSize: 12, color: COLORS.textGray, marginBottom: 12, textAlign: 'left', fontFamily: 'Cairo-Regular' },

  // Pricing inputs
  pricingRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  priceCol: {
    flex: 1,
  },
  priceColTitle: {
    fontSize: 11,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    height: 48,
  },
  priceTextInput: {
    flex: 1,
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    paddingVertical: 0,
  },
  priceCurrency: {
    fontSize: 10,
    fontFamily: 'Cairo-Bold',
    color: COLORS.textGray,
    marginStart: 2,
  },

  // Vehicle cards
  row:                  { flexDirection: 'row', gap: 10, marginBottom: 10 },
  selectionCard:        { flex: 1, height: 90, borderRadius: 20, borderWidth: 2, borderColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  selectionCardActive:  { borderColor: COLORS.secondary, shadowColor: COLORS.secondary, shadowOpacity: 0.15, elevation: 5 },
  vehicleImage:         { width: 64, height: 64 },
  selectionTitle:       { fontSize: 13, fontWeight: '700', color: COLORS.textGray, marginTop: 4 },
  selectionTitleActive: { color: COLORS.primary, fontWeight: '900' },

  // Dynamic section
  dynamicSection: { marginTop: 5, marginBottom: 5 },
  selectedCount:  { fontSize: 12, fontWeight: '700', color: COLORS.secondary, textAlign: 'left', marginBottom: 10, marginTop: -8 },

  // Brand grid — 3 في الصف
  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  brandCard: {
    width: (width - 80) / 3,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  brandCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.white, elevation: 3, shadowColor: COLORS.primary, shadowOpacity: 0.1, shadowRadius: 6 },
  brandLogo:       { width: 48, height: 48, marginBottom: 6 },
  brandName:       { fontSize: 11, fontWeight: '700', color: COLORS.textGray, textAlign: 'center' },
  brandNameActive: { color: COLORS.primary, fontWeight: '900' },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tanker chips
  waterTypeRow: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    height: 85,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    paddingVertical: 10,
  },
  chipActive:     { backgroundColor: COLORS.secondary },
  chipText:       { fontSize: 12, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  chipTextActive: { fontWeight: '900' },

  // Submit
  submitButton:     { flexDirection: 'row', height: 60, backgroundColor: COLORS.secondary, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginTop: 30, gap: 10, elevation: 5 },
  submitButtonText: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  footerLink:       { alignItems: 'center', marginTop: 20, marginBottom: 10 },
  footerText:       { fontSize: 14, color: COLORS.textGray },
  footerBold:       { fontWeight: '800', color: COLORS.primary },

  // ── Success Modal Styles ─────────────────────────────────────────────────────
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E', // Green
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 38,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  successTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 22,
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMsg: {
    fontFamily: 'Cairo-Regular',
    fontSize: 15,
    color: COLORS.textGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  successBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  successBtnText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 17,
    color: COLORS.primary,
  },
});

export default DriverRegistrationScreen;
