import ScreenContainer from '../../components/ScreenContainer';
import React, { useState, useRef } from 'react';
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
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

// ── Brand Tokens ──────────────────────────────────────────────────────────────
const NAVY      = '#002147';
const NAVY_DARK = '#001530';
const GOLD      = '#D4AF37';
const WHITE     = '#FFFFFF';
const MUTED     = '#8793A4';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSendCode = () => {
    if (!phone.trim() || phone.length < 9) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);
    setStep(2); // الانتقال لخطوة الرمز
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto focus next
    if (text && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    if (otp.join('').length === 4) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 3000);
    }
  };

  return (
    <ScreenContainer style={[styles.root]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY_DARK} />

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 16 }]}
        onPress={() => {
          if (step === 2) {
            setStep(1);
            setOtp(['', '', '', '']);
          } else {
            router.back();
          }
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-forward-outline" size={24} color={GOLD} />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        behavior="padding"
        style={{ flex: 1 }}
       keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
          
          <View style={styles.iconBadge}>
            <Ionicons name={step === 1 ? "lock-closed-outline" : "chatbubble-ellipses-outline"} size={36} color={NAVY} />
          </View>

          <Text style={styles.title}>
            {step === 1 ? 'نسيت كلمة المرور؟' : 'تأكيد الرمز'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 
              ? 'الرجاء إدخال رقم هاتفك المرتبط بحسابك. سنقوم بإرسال رمز تحقق (OTP) لاستعادة الحساب.'
              : `الرجاء إدخال رمز التحقق المكون من 4 أرقام والذي تم إرساله إلى رقمك ${phone}`
            }
          </Text>

          {step === 1 ? (
            // الخطوة 1: إدخال رقم الهاتف
            <View style={styles.formContainer}>
              <View style={[styles.inputContainer, phoneError && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="05 50 00 00 00"
                  placeholderTextColor={MUTED}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (phoneError) setPhoneError(false);
                  }}
                  maxLength={10}
                />
                <View style={styles.countryCodeBox}>
                  <Text style={styles.countryCodeText}>+213</Text>
                  <Ionicons name="call" size={18} color={GOLD} style={{ marginLeft: 6 }} />
                </View>
              </View>
              {phoneError && <Text style={styles.errorText}>يرجى إدخال رقم هاتف صحيح</Text>}

              <TouchableOpacity style={styles.btn} onPress={handleSendCode} activeOpacity={0.8}>
                <Text style={styles.btnText}>إرسال الرمز</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // الخطوة 2: إدخال رمز التحقق
            <View style={styles.formContainer}>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                        otpRefs.current[index - 1]?.focus();
                      }
                    }}
                  />
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.btn, otp.join('').length < 4 && styles.btnDisabled]} 
                onPress={handleVerifyOtp} 
                activeOpacity={0.8}
                disabled={otp.join('').length < 4}
              >
                <Text style={styles.btnText}>تحقق ومتابعة</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn}>
                <Text style={styles.resendText}>لم تستلم الرمز؟ <Text style={styles.resendHighlight}>إعادة إرسال</Text></Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={70} color="#34C759" />
            </View>
            <Text style={styles.successTitle}>تم التحقق بنجاح!</Text>
            <Text style={styles.successDesc}>لقد تم تأكيد هويتك، سيتم توجيهك لإنشاء كلمة مرور جديدة لتأمين حسابك.</Text>
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
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
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
    borderColor: '#E63946',
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
  errorText: {
    color: '#E63946',
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'left',
    marginTop: 8,
  },
  otpContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpInput: {
    width: 60,
    height: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 16,
    color: WHITE,
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
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
    marginTop: 20,
  },
  btnDisabled: {
    backgroundColor: 'rgba(212, 175, 55, 0.4)',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 18,
    color: NAVY_DARK,
  },
  resendBtn: {
    marginTop: 25,
    alignItems: 'center',
  },
  resendText: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 14,
    color: MUTED,
  },
  resendHighlight: {
    color: GOLD,
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
  }
});
