import ScreenContainer from '../../components/ScreenContainer';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

// ── Brand Tokens ──────────────────────────────────────────────────────────────
const NAVY      = '#002147';
const NAVY_DARK = '#001530';
const GOLD      = '#D4AF37';
const WHITE     = '#FFFFFF';
const MUTED     = '#8793A4';
const ERROR     = '#E63946';
const SUCCESS   = '#34C759';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Step: 1 = enter phone, 2 = enter new password ──────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [phone, setPhone]           = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loadingPhone, setLoadingPhone] = useState(false);

  // Step 2
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [passwordError, setPasswordError]     = useState('');
  const [loadingReset, setLoadingReset]       = useState(false);

  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Step 1: verify phone exists ────────────────────────────────────────────
  const handleCheckPhone = async () => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 9) {
      setPhoneError('يرجى إدخال رقم هاتف صحيح (9 أرقام على الأقل)');
      return;
    }
    setPhoneError('');
    setLoadingPhone(true);
    try {
      // Format: if user types 0550... convert to +213550...
      const formatted = trimmed.startsWith('0')
        ? '+213' + trimmed.slice(1)
        : trimmed.startsWith('+213')
        ? trimmed
        : '+213' + trimmed;

      await api.post('/auth/client/check-phone', { phone: formatted });
      setStep(2);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setPhoneError(msg || 'رقم الهاتف غير مسجّل في النظام');
    } finally {
      setLoadingPhone(false);
    }
  };

  // ── Step 2: reset password ─────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين');
      return;
    }
    setPasswordError('');
    setLoadingReset(true);
    try {
      const formatted = phone.trim().startsWith('0')
        ? '+213' + phone.trim().slice(1)
        : phone.trim().startsWith('+213')
        ? phone.trim()
        : '+213' + phone.trim();

      await api.post('/auth/client/reset-password', {
        phone: formatted,
        newPassword,
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setPasswordError(msg || 'حدث خطأ، يرجى المحاولة مجدداً');
    } finally {
      setLoadingReset(false);
    }
  };

  // ── Back handler ───────────────────────────────────────────────────────────
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    } else {
      router.back();
    }
  };

  return (
    <ScreenContainer style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY_DARK} />

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 16 }]}
        onPress={handleBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-forward-outline" size={24} color={GOLD} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={styles.iconBadge}>
            <Ionicons
              name={step === 1 ? 'lock-closed-outline' : 'key-outline'}
              size={36}
              color={NAVY}
            />
          </View>

          {/* Title & subtitle */}
          <Text style={styles.title}>
            {step === 1 ? 'نسيت كلمة المرور؟' : 'كلمة مرور جديدة'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'أدخل رقم هاتفك المسجّل. إذا كان الرقم موجوداً، سنسمح لك بتغيير كلمة المرور فوراً.'
              : `أدخل كلمة المرور الجديدة لحسابك المرتبط بالرقم ${phone.trim()}`}
          </Text>

          {/* ── STEP 1: Phone input ─────────────────────────────────────── */}
          {step === 1 && (
            <View style={styles.formContainer}>
              <View style={[styles.inputContainer, phoneError ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="05 50 00 00 00"
                  placeholderTextColor={MUTED}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (phoneError) setPhoneError('');
                  }}
                  maxLength={13}
                  editable={!loadingPhone}
                />
                <View style={styles.countryCodeBox}>
                  <Text style={styles.countryCodeText}>+213</Text>
                  <Ionicons name="call" size={18} color={GOLD} style={{ marginLeft: 6 }} />
                </View>
              </View>
              {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

              <TouchableOpacity
                style={[styles.btn, loadingPhone && styles.btnDisabled]}
                onPress={handleCheckPhone}
                activeOpacity={0.8}
                disabled={loadingPhone}
              >
                {loadingPhone
                  ? <ActivityIndicator color={NAVY_DARK} />
                  : <Text style={styles.btnText}>التحقق من الرقم</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: New password ────────────────────────────────────── */}
          {step === 2 && (
            <View style={styles.formContainer}>
              {/* New password */}
              <Text style={styles.fieldLabel}>كلمة المرور الجديدة</Text>
              <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                  <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={22} color={MUTED} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={MUTED}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    if (passwordError) setPasswordError('');
                  }}
                  editable={!loadingReset}
                />
              </View>

              {/* Confirm password */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>تأكيد كلمة المرور</Text>
              <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={22} color={MUTED} />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={MUTED}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (passwordError) setPasswordError('');
                  }}
                  editable={!loadingReset}
                />
              </View>

              {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

              <TouchableOpacity
                style={[styles.btn, (loadingReset || newPassword.length < 6 || !confirmPassword) && styles.btnDisabled]}
                onPress={handleResetPassword}
                activeOpacity={0.8}
                disabled={loadingReset || newPassword.length < 6 || !confirmPassword}
              >
                {loadingReset
                  ? <ActivityIndicator color={NAVY_DARK} />
                  : <Text style={styles.btnText}>حفظ كلمة المرور</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Strength hint */}
          {step === 2 && (
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={16} color={MUTED} />
              <Text style={styles.hintText}>كلمة المرور يجب أن تكون 6 أحرف على الأقل</Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Success Modal ───────────────────────────────────────────────────── */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={70} color={SUCCESS} />
            </View>
            <Text style={styles.successTitle}>تم تغيير كلمة المرور!</Text>
            <Text style={styles.successDesc}>
              تم تحديث كلمة مرور حسابك بنجاح. يمكنك الآن تسجيل الدخول بالكلمة الجديدة.
            </Text>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY_DARK,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 80,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontFamily: 'Cairo-Bold',
    fontSize: 26,
    color: WHITE,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Cairo-Regular',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  formContainer: {
    width: '100%',
  },
  fieldLabel: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 14,
    color: MUTED,
    textAlign: 'right',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    height: 60,
    overflow: 'hidden',
  },
  inputError: {
    borderColor: ERROR,
    backgroundColor: 'rgba(230, 57, 70, 0.05)',
  },
  input: {
    flex: 1,
    color: WHITE,
    fontSize: 18,
    fontFamily: 'Cairo-SemiBold',
    paddingHorizontal: 15,
    textAlign: 'left',
    letterSpacing: 2,
  },
  countryCodeBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: '100%',
    paddingHorizontal: 15,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  countryCodeText: {
    color: WHITE,
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: ERROR,
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'right',
    marginTop: 8,
  },
  btn: {
    backgroundColor: GOLD,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 24,
  },
  btnDisabled: {
    backgroundColor: 'rgba(212, 175, 55, 0.35)',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 18,
    color: NAVY_DARK,
  },
  hintRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  hintText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 12,
    color: MUTED,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successCard: {
    backgroundColor: WHITE,
    width: '100%',
    borderRadius: 28,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  successIconBox: {
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: NAVY,
    marginBottom: 10,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 24,
  },
});
