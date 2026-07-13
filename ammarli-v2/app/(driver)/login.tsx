import React, { useState, useRef } from 'react';
import ScreenContainer from '../../components/ScreenContainer';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  TextInput,
  BackHandler,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import AmmarliInput from '../../components/AmmarliInput';

const COLORS = {
  primary:       '#003366',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  background:    '#F8FAFC',
  inputBg:       '#F1F5F9',
  textSecondary: '#64748B',
  border:        '#E2E8F0',
  error:         '#E53935',
};

const DriverLoginScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passError, setPassError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

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

  const validate = (): boolean => {
    let valid = true;
    setPhoneError('');
    setPassError('');

    if (!phone.trim()) {
      setPhoneError('رقم الهاتف مطلوب');
      valid = false;
    } else if (!/^0\d{9}$/.test(phone.trim())) {
      setPhoneError('أدخل رقم هاتف صحيح (10 أرقام يبدأ بـ 0)');
      valid = false;
    }

    if (!password) {
      setPassError('كلمة المرور مطلوبة');
      valid = false;
    } else if (password.length < 6) {
      setPassError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      valid = false;
    }

    if (!valid) shake();
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await useAuthStore.getState().login(phone, password, 'DRIVER');
      router.replace('/(driver)/(tabs)' as any);
    } catch (e: any) {
      setPassError(e?.response?.data?.message || 'فشل تسجيل الدخول. تحقق من بياناتك.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  const FormContent = (
    <View style={styles.contentWrapper}>
      {/* Top Logo */}
      <View style={[styles.logoContainer, { marginTop: insets.top > 0 ? insets.top : 20 }]}>
        <Text style={styles.logoText}>AMMARLI</Text>
      </View>

      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/role-selection')}>
          <Ionicons name='chevron-forward' size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تسجيل دخول السائق</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.title}>مرحباً بك مجدداً</Text>
        <Text style={styles.subtitle}>الرجاء إدخال بياناتك للمتابعة</Text>
      </View>

      {/* Form */}
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        
        {/* Phone Input */}
        <AmmarliInput
          label="رقم الهاتف"
          iconName="call-outline"
          placeholder="05X XXX XXXX"
          keyboardType="phone-pad"
          returnKeyType="next"
          value={phone}
          error={phoneError}
          isValid={phone.length === 10}
          onChangeText={(t) => { setPhone(t); setPhoneError(''); }}
          onSubmitEditing={() => passwordRef.current?.focus()}
          blurOnSubmit={false}
          maxLength={10}
        />

        {/* Password Input */}
        <AmmarliInput
          ref={passwordRef}
          label="كلمة السر"
          iconName="lock-closed-outline"
          placeholder="••••••••"
          isPassword={true}
          returnKeyType="done"
          value={password}
          error={passError}
          onChangeText={(t) => { setPassword(t); setPassError(''); }}
          onSubmitEditing={handleLogin}
        />

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotBtn}>
          <Text style={styles.forgotPassText}>نسيت كلمة المرور؟</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.75 }]}
          activeOpacity={0.8}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <>
              <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
              <Ionicons name='arrow-back' size={22} color={COLORS.primary} style={{ marginStart: 12 }} />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Spacer to push signup link to bottom */}
      <View style={styles.spacer} />

      {/* Sign Up Link */}
      <TouchableOpacity
        style={styles.signUpLink}
        onPress={() => router.push('/(driver)/register')}
      >
        <Text style={styles.signUpText}>
          ليس لديك حساب؟{' '}
          <Text style={styles.signUpBold}>إنشاء حساب جديد</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />
      
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {FormContent}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30 },
  contentWrapper: { flex: 1, minHeight: '100%', paddingVertical: 20 },

  logoContainer: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  logoText: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary, letterSpacing: 4 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontFamily: 'Cairo-Bold', color: COLORS.primary },

  greetingSection: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 26, fontFamily: 'Cairo-Bold', color: COLORS.primary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: 'Cairo-Regular', color: COLORS.textSecondary, textAlign: 'center' },

  forgotBtn: { alignSelf: 'flex-start', marginTop: 12 },
  forgotPassText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary },

  loginButton: {
    flexDirection: 'row', 
    height: 64, 
    backgroundColor: COLORS.secondary,
    borderRadius: 32, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 16,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  loginButtonText: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary },

  spacer: { flex: 1, minHeight: 40 },

  signUpLink: { alignItems: 'center', paddingBottom: 10 },
  signUpText: { fontSize: 15, fontFamily: 'Cairo-Regular', color: COLORS.textSecondary },
  signUpBold: { fontFamily: 'Cairo-Bold', color: COLORS.primary },
});

export default DriverLoginScreen;
