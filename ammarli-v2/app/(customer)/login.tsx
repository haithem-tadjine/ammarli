import ScreenContainer from '../../components/ScreenContainer';
/**
 * ─── Customer Login Screen ───────────────────────────────────────────────────
 * Premium Uber-style design · Deep Navy & Vibrant Yellow
 * RTL-first · Cairo font · Full validation & animation
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter, Link, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import AmmarliInput from '../../components/AmmarliInput';

// ── Brand Tokens ──────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function CustomerLoginScreen() {
  const insets = useSafeAreaInsets();
  const router      = useRouter();
  
  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [phoneError,  setPhoneError]  = useState('');
  const [passError,   setPassError]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [phoneFocus,  setPhoneFocus]  = useState(false); // Can be removed later
  const [passFocus,   setPassFocus]   = useState(false); // Can be removed later

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

  // ── Shake animation ────────────────────────────────────────────────────────
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

  // ── Validation ─────────────────────────────────────────────────────────────
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

  // ── Login handler ──────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await useAuthStore.getState().login(phone, password, 'CLIENT');
      router.replace('/(customer)/(tabs)' as any);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        setPassError('رقم الهاتف أو كلمة المرور غير صحيحة.');
      } else {
        setPassError(e?.response?.data?.message || 'فشل تسجيل الدخول. تحقق من بياناتك.');
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScreenContainer style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.flex}
       keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { flexGrow: 1, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Welcome Header ────────────────────────────────────────────── */}
          <View style={[styles.logoContainer, { marginTop: insets.top > 0 ? insets.top : 20 }]}>
            <Text style={styles.logoText}>AMMARLI</Text>
          </View>

          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/role-selection')}>
              <Ionicons name='chevron-forward' size={28} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>تسجيل دخول العميل</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.greetingSection}>
            <Text style={styles.title}>مرحباً بك مجدداً</Text>
            <Text style={styles.subtitle}>سجل دخولك لطلب المياه بسرعة وسهولة</Text>
          </View>

          {/* ── Form ──────────────────────────────────────────────────────── */}
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
              <TouchableOpacity
                style={styles.forgotPassBtn}
                onPress={() => router.push('/(customer)/forgot-password' as any)}
              >
                <Text style={styles.forgotPassText}>نسيت كلمة السر؟</Text>
              </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.75 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
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

          {/* ── Sign Up Link ───────────────────────────────────────────────── */}
          <Link href="/(customer)/register" asChild>
            <TouchableOpacity style={styles.signUpLink}>
              <Text style={styles.signUpText}>
                ليس لديك حساب؟{' '}
                <Text style={styles.signUpBold}>إنشاء حساب جديد</Text>
              </Text>
            </TouchableOpacity>
          </Link>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    paddingTop: 48,
  },

  // Header & Welcome
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logoText: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary, letterSpacing: 4 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontFamily: 'Cairo-Bold', color: COLORS.primary },

  greetingSection: { alignItems: 'center', marginBottom: 40 },
  title: {
    fontFamily: 'Cairo-Bold',
    fontSize: 26,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Cairo-Regular',
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Removed old inline input styles (handled by AmmarliInput)

  // Forgot
  forgotPassBtn: { alignSelf: 'flex-start', marginTop: 12 },
  forgotPassText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
    color: COLORS.primary,
  },

  // Login button
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
  loginButtonText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 18,
    color: COLORS.primary,
  },

  // Sign up
  signUpLink: { alignItems: 'center', marginTop: 32 },
  signUpText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  signUpBold: {
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
  },
});
