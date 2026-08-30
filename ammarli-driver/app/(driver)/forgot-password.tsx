import ScreenContainer from '../../components/ScreenContainer';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Animated, StatusBar, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Phone, Lock, Eye, EyeOff, Truck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/services/api';
import { useDriverStore } from '../../src/store/useDriverStore';

const THEME_NAVY = '#002147';
const THEME_YELLOW = '#F3CD0D';

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const setAuth = useDriverStore((state: any) => state.setAuth); // For auto login

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handleVerify = async () => {
    if (!phone || !plateNumber) {
      setErrorMsg('الرجاء إدخال رقم الهاتف ورقم لوحة الشاحنة');
      shake();
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    
    try {
      await api.post('/auth/driver/verify-plate', { phone, truckPlate: plateNumber });
      setStep(2); // Move to step 2 if successful
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'البيانات غير متطابقة. تأكد من الرقم ولوحة الشاحنة.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setErrorMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      shake();
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    
    try {
      // 1. Reset the password
      await api.post('/auth/driver/reset-password-plate', {
        phone,
        truckPlate: plateNumber,
        newPassword
      });
      
      // 2. Auto Login
      const loginRes = await api.post('/auth/login', {
        phone,
        password: newPassword,
        role: 'DRIVER'
      });
      
      const { accessToken, refreshToken, user } = loginRes.data;
      setAuth({ user, accessToken, refreshToken });
      
      setSuccessMsg('تم التغيير وتسجيل الدخول بنجاح!');
      timeoutRef.current = setTimeout(() => {
        router.replace('/(driver)/(tabs)' as any); // Navigate directly to tabs
      }, 1000);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'حدث خطأ أثناء تغيير كلمة المرور.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_NAVY} />
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.logoWrapper}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} />
            <Text style={styles.brandName}>Ammarli</Text>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.loginCard, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.roleTitle}>{step === 1 ? 'التحقق من الهوية' : 'تعيين كلمة مرور جديدة'}</Text>
            
            {step === 1 ? (
              <>
                {/* Phone Input */}
                <View style={styles.inputContainer}>
                  <View style={[styles.inputField, errorMsg ? styles.inputError : null]}>
                    <TextInput
                      keyboardType="phone-pad"
                      onChangeText={(text) => { setPhone(text); setErrorMsg(''); }}
                      placeholder="رقم الهاتف"
                      placeholderTextColor="#ADB5BD"
                      style={styles.textInput}
                      textAlign="right"
                      value={phone}
                      maxLength={10}
                    />
                    <Phone color={THEME_NAVY} size={22} style={styles.fieldIcon} />
                  </View>
                </View>

                {/* Truck Plate Input */}
                <View style={styles.inputContainer}>
                  <View style={[styles.inputField, errorMsg ? styles.inputError : null]}>
                    <TextInput
                      onChangeText={(text) => { setPlateNumber(text); setErrorMsg(''); }}
                      placeholder="رقم لوحة الشاحنة"
                      placeholderTextColor="#ADB5BD"
                      style={styles.textInput}
                      textAlign="right"
                      value={plateNumber}
                    />
                    <Truck color={THEME_NAVY} size={22} style={styles.fieldIcon} />
                  </View>
                  {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                </View>

                {/* Submit Button Step 1 */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleVerify}
                  style={[styles.loginButton, loading && { opacity: 0.75 }]}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={THEME_NAVY} size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>تحقق والمتابعة</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* New Password Input */}
                <View style={styles.inputContainer}>
                  <View style={[styles.inputField, errorMsg ? styles.inputError : null]}>
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.toggleIcon} activeOpacity={0.7}>
                      {showPassword ? <EyeOff color="#8E8E93" size={20} /> : <Eye color="#8E8E93" size={20} />}
                    </TouchableOpacity>
                    <TextInput
                      onChangeText={(text) => { setNewPassword(text); setErrorMsg(''); }}
                      placeholder="كلمة المرور الجديدة"
                      placeholderTextColor="#ADB5BD"
                      secureTextEntry={!showPassword}
                      style={[styles.textInput, (!showPassword) && { fontFamily: undefined }]}
                      textAlign="right"
                      value={newPassword}
                    />
                    <Lock color={THEME_NAVY} size={22} style={styles.fieldIcon} />
                  </View>
                  {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                  {!!successMsg && <Text style={styles.successText}>{successMsg}</Text>}
                </View>

                {/* Submit Button Step 2 */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleResetPassword}
                  style={[styles.loginButton, loading && { opacity: 0.75 }]}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={THEME_NAVY} size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>حفظ ودخول</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Footer Links */}
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.back()}>
                <Text style={styles.linkText}>{step === 2 ? 'رجوع للخلف' : 'العودة لتسجيل الدخول'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: THEME_NAVY, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  logoWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  logoImage: { width: 45, height: 45, resizeMode: 'contain', marginRight: 12 },
  brandName: { fontSize: 32, fontFamily: 'Cairo-Black', color: '#FFF', letterSpacing: 1 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, marginTop: -40 },
  roleTitle: { fontSize: 22, fontFamily: 'Cairo-Black', color: THEME_NAVY, textAlign: 'center', marginBottom: 25 },
  inputContainer: { marginBottom: 18 },
  inputField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: '#E2E8F0' },
  inputError: { borderColor: '#FF3B30', backgroundColor: '#FFF0F0' },
  fieldIcon: { marginLeft: 10 },
  textInput: { flex: 1, height: '100%', fontSize: 15, fontFamily: 'Cairo-SemiBold', color: '#1E293B', textAlign: 'right' },
  toggleIcon: { padding: 10, position: 'absolute', left: 5, zIndex: 1 },
  errorText: { color: '#FF3B30', fontSize: 13, fontFamily: 'Cairo-Bold', marginTop: 5, textAlign: 'right' },
  successText: { color: '#34C759', fontSize: 13, fontFamily: 'Cairo-Bold', marginTop: 5, textAlign: 'right' },
  loginButton: { backgroundColor: THEME_YELLOW, borderRadius: 16, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: THEME_YELLOW, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginButtonText: { color: THEME_NAVY, fontSize: 18, fontFamily: 'Cairo-Black' },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  linkText: { color: THEME_NAVY, fontSize: 14, fontFamily: 'Cairo-Bold' },
});

export default ForgotPasswordScreen;
