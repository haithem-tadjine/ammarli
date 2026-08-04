import ScreenContainer from '../../components/ScreenContainer';
/**
 * ─── Customer Register Screen ────────────────────────────────────────────────
 * Navy & Yellow split design · Water-drop logo · RTL-first · Cairo font
 * Wilaya field intentionally removed — backend does not persist it.
 */

import React, { useState, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView, I18nManager, Animated, ActivityIndicator,
  Modal, Alert, Keyboard, Image
} from 'react-native';
import { User, Phone, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useRouter, Link } from 'expo-router';

const { height } = Dimensions.get('window');
const THEME_NAVY   = '#012047';
const THEME_YELLOW = '#F3CD0D';
const WHITE        = '#FFFFFF';
const BORDER_COLOR = '#E5E5EA';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function CustomerRegisterScreen() {
  const router = useRouter();

  // ── Form state ────────────────────────────────────────────────────────────
  const [fullName,         setFullName]         = useState('');
  const [phone,            setPhone]            = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [showPassword,     setShowPassword]     = useState(false);
  const [showConfirm,      setShowConfirm]      = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [successModal,     setSuccessModal]     = useState(false);

  // ── Error state ───────────────────────────────────────────────────────────
  const [nameErr,    setNameErr]    = useState('');
  const [phoneErr,   setPhoneErr]   = useState('');
  const [passErr,    setPassErr]    = useState('');
  const [confirmErr, setConfirmErr] = useState('');

  // ── Refs (tab-key chain) ──────────────────────────────────────────────────
  const phoneRef   = useRef<TextInput>(null);
  const passRef    = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // ── Shake animation ───────────────────────────────────────────────────────
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

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    let ok = true;
    setNameErr(''); setPhoneErr(''); setPassErr(''); setConfirmErr('');

    if (!fullName.trim()) {
      setNameErr('الاسم الكامل مطلوب'); ok = false;
    }

    if (!phone.trim()) {
      setPhoneErr('رقم الهاتف مطلوب'); ok = false;
    } else if (!/^0\d{9}$/.test(phone.trim())) {
      setPhoneErr('رقم هاتف صحيح (10 أرقام يبدأ بـ 0)'); ok = false;
    }

    if (!password) {
      setPassErr('كلمة المرور مطلوبة'); ok = false;
    } else if (password.length < 6) {
      setPassErr('6 أحرف على الأقل'); ok = false;
    }

    if (!confirmPassword) {
      setConfirmErr('تأكيد كلمة المرور مطلوب'); ok = false;
    } else if (confirmPassword !== password) {
      setConfirmErr('كلمتا المرور غير متطابقتين'); ok = false;
    }

    if (!ok) shake();
    return ok;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/phone/register', {
        phone:     phone.trim(),
        firstName: fullName.trim().split(' ')[0],
        lastName:  fullName.trim().split(' ').slice(1).join(' ') || ' ',
        password:  password,
        role:      'CLIENT',
      });
      setSuccessModal(true);
    } catch (e: any) {
      const errCode = e?.response?.data?.response?.errorCode;
      const msg = Array.isArray(e?.response?.data?.message)
        ? e.response.data.message[0]
        : e?.response?.data?.message;
      if (errCode === 'user.error.phone_exists') {
        setPhoneErr('رقم الهاتف مسجّل مسبقاً. يرجى تسجيل الدخول.');
      } else {
        Alert.alert('خطأ', msg || 'حدث خطأ. حاول مجدداً.');
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME_NAVY} barStyle="light-content" />

      {/* ── Success Modal ──────────────────────────────────────────────────── */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>تم إنشاء الحساب بنجاح!</Text>
            <Text style={styles.successMsg}>
              مرحباً بك في AMMARLI 🎉{'\n'}
              يمكنك الآن تسجيل الدخول بالرقم وكلمة المرور.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => {
                setSuccessModal(false);
                router.replace('/(customer)/login' as any);
              }}
            >
              <Text style={styles.successBtnText}>تسجيل الدخول ←</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Navy Header with Logo ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.logoWrapper}>
            <Image source={require('../../assets/images/logo.png')} style={{width: 60, height: 60, marginBottom: 5}} resizeMode="contain" />
            <Text style={styles.brandName}>AMMARLI</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexOne}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم الكامل</Text>
              <View style={[styles.inputField, !!nameErr && styles.inputError]}>
                <TextInput
                  placeholder="أدخل اسمك بالكامل"
                  placeholderTextColor="#ADB5BD"
                  style={styles.textInput}
                  textAlign="right"
                  value={fullName}
                  onChangeText={(t) => { setFullName(t); setNameErr(''); }}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <User color={THEME_NAVY} size={22} style={styles.fieldIcon} />
              </View>
              {!!nameErr && <Text style={styles.errText}>{nameErr}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>رقم الهاتف</Text>
              <View style={[styles.inputField, !!phoneErr && styles.inputError]}>
                <TextInput
                  ref={phoneRef}
                  keyboardType="phone-pad"
                  placeholder="05XXXXXXXX"
                  placeholderTextColor="#ADB5BD"
                  style={styles.textInput}
                  textAlign="right"
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setPhoneErr(''); }}
                  returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()}
                  blurOnSubmit={false}
                  maxLength={10}
                />
                <Phone color={THEME_NAVY} size={22} style={styles.fieldIcon} />
              </View>
              {!!phoneErr && <Text style={styles.errText}>{phoneErr}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>كلمة المرور</Text>
              <View style={[styles.inputField, !!passErr && styles.inputError]}>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.toggleIcon}
                  activeOpacity={0.7}
                >
                  {showPassword ? <EyeOff color="#8E8E93" size={20} /> : <Eye color="#8E8E93" size={20} />}
                </TouchableOpacity>
                <TextInput
                  ref={passRef}
                  placeholder="••••••••"
                  placeholderTextColor="#ADB5BD"
                  secureTextEntry={!showPassword}
                  style={styles.textInput}
                  textAlign="right"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setPassErr(''); }}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  blurOnSubmit={false}
                  autoCapitalize="none"
                />
                <Lock color={THEME_NAVY} size={22} style={styles.fieldIcon} />
              </View>
              {!!passErr && <Text style={styles.errText}>{passErr}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>تأكيد كلمة المرور</Text>
              <View style={[styles.inputField, !!confirmErr && styles.inputError]}>
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={styles.toggleIcon}
                  activeOpacity={0.7}
                >
                  {showConfirm ? <EyeOff color="#8E8E93" size={20} /> : <Eye color="#8E8E93" size={20} />}
                </TouchableOpacity>
                <TextInput
                  ref={confirmRef}
                  placeholder="••••••••"
                  placeholderTextColor="#ADB5BD"
                  secureTextEntry={!showConfirm}
                  style={styles.textInput}
                  textAlign="right"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setConfirmErr(''); }}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  autoCapitalize="none"
                />
                <RefreshCw color={THEME_NAVY} size={22} style={styles.fieldIcon} />
              </View>
              {!!confirmErr && <Text style={styles.errText}>{confirmErr}</Text>}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRegister}
              style={[styles.registerButton, loading && { opacity: 0.75 }]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={THEME_NAVY} size="small" />
              ) : (
                <Text style={styles.registerButtonText}>إنشاء حساب</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace('/(customer)/login' as any)}
            >
              <Text style={styles.footerText}>
                لديك حساب بالفعل؟{' '}
                <Text style={styles.boldText}>تسجيل الدخول</Text>
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_NAVY },
  flexOne:   { flex: 1 },

  // Header / Logo
  header:      { height: height * 0.15, justifyContent: 'center', alignItems: 'center', marginTop: Platform.OS === 'android' ? 20 : 0 },
  logoWrapper: { alignItems: 'center' },
  logoIcon:    { width: 70, height: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  dropOutline: {
    width: 40, height: 55,
    borderWidth: 4, borderColor: THEME_YELLOW,
    borderRadius: 20, borderTopLeftRadius: 5,
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center', alignItems: 'center',
  },
  dropFill:  { width: 15, height: 15, backgroundColor: THEME_YELLOW, borderRadius: 7.5 },
  brandName: {
    fontSize: 24, fontWeight: '900', color: WHITE,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-black',
  },

  // Scroll / Card
  scrollContent: { paddingHorizontal: 25, paddingBottom: 40 },
  formCard: {
    backgroundColor: WHITE, borderRadius: 35, padding: 30, width: '100%',
    elevation: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 25,
  },

  // Input Groups
  inputGroup:  { marginBottom: 20 },
  inputLabel:  { fontSize: 15, fontWeight: 'bold', color: THEME_NAVY, textAlign: 'right', marginBottom: 10, fontFamily: 'Cairo-Bold' },
  inputField:  {
    flexDirection: 'row', height: 60, backgroundColor: WHITE,
    borderRadius: 15, borderWidth: 1.5, borderColor: BORDER_COLOR,
    alignItems: 'center', paddingHorizontal: 15,
  },
  inputError: { borderColor: '#E53935' },
  textInput:  { flex: 1, fontSize: 16, color: THEME_NAVY, fontWeight: '600', paddingHorizontal: 10, fontFamily: 'Cairo-Regular' },
  fieldIcon:  { marginLeft: 10 },
  toggleIcon: { padding: 5 },
  errText:    { fontFamily: 'Cairo-Regular', fontSize: 12, color: '#E53935', marginTop: 6, textAlign: 'right' },

  // Register Button
  registerButton: {
    backgroundColor: THEME_YELLOW, height: 65, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginTop: 15,
    shadowColor: THEME_YELLOW, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 15, elevation: 8,
  },
  registerButtonText: { fontSize: 22, fontWeight: '900', color: THEME_NAVY, fontFamily: 'Cairo-Bold' },

  // Footer Login Link
  loginLink:  { marginTop: 30, alignItems: 'center' },
  footerText: { fontSize: 14, color: '#8E8E93', fontWeight: '500', fontFamily: 'Cairo-Regular' },
  boldText:   { color: THEME_NAVY, fontWeight: 'bold', fontFamily: 'Cairo-Bold', textDecorationLine: 'underline' },

  // Success Modal
  successOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  successCard: {
    backgroundColor: WHITE, borderRadius: 28,
    paddingVertical: 40, paddingHorizontal: 32, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 20,
  },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  successIconText: { fontSize: 38, color: WHITE, fontWeight: 'bold' },
  successTitle:    { fontFamily: 'Cairo-Bold', fontSize: 22, color: THEME_NAVY, marginBottom: 12, textAlign: 'center' },
  successMsg:      { fontFamily: 'Cairo-Regular', fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  successBtn: {
    backgroundColor: THEME_YELLOW, borderRadius: 32,
    paddingVertical: 16, paddingHorizontal: 40, width: '100%', alignItems: 'center',
    shadowColor: THEME_YELLOW, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  successBtnText: { fontFamily: 'Cairo-Bold', fontSize: 17, color: THEME_NAVY },
});
