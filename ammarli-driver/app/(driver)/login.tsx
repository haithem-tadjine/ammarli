import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  I18nManager,
  Animated,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Image
} from 'react-native';
import { Phone, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useRouter, Link, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { useAuthStore } from '../../src/store/useAuthStore';

const { width, height } = Dimensions.get('window');
const THEME_NAVY = '#0a2540';
const THEME_YELLOW = '#ffc014';
const WHITE = '#FFFFFF';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function DriverLoginScreen() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
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
    Keyboard.dismiss();
    if (!validate()) return;
    setLoading(true);
    try {
      await useAuthStore.getState().login(phone, password, 'DRIVER');
      router.replace('/(driver)/(tabs)' as any);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        setPassError('رقم الهاتف أو كلمة المرور غير صحيحة.');
      } else if (status >= 500) {
        setPassError('عذراً، حدث خطأ في النظام. يرجى المحاولة لاحقاً.');
      } else {
        let msg = e?.response?.data?.message || 'فشل تسجيل الدخول. تحقق من بياناتك.';
        if (Array.isArray(msg)) msg = msg[0];
        setPassError(msg);
      }
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
              
              <Text style={styles.roleTitle}>تسجيل دخول السائق</Text>
              
              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <View style={[styles.inputField, phoneError ? styles.inputError : null]}>
                  <TextInput
                    keyboardType="phone-pad"
                    onChangeText={(text) => { setPhone(text); setPhoneError(''); }}
                    placeholder="رقم الهاتف"
                    placeholderTextColor="#ADB5BD"
                    style={styles.textInput}
                    textAlign="right"
                    value={phone}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                    maxLength={10}
                  />
                  <Phone color={THEME_NAVY} size={22} style={styles.fieldIcon} />
                </View>
                {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={[styles.inputField, passError ? styles.inputError : null]}>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.toggleIcon} activeOpacity={0.7}>
                    {showPassword ? <EyeOff color="#8E8E93" size={20} /> : <Eye color="#8E8E93" size={20} />}
                  </TouchableOpacity>
                  <TextInput
                    ref={passwordRef}
                    onChangeText={(text) => { setPassword(text); setPassError(''); }}
                    placeholder="كلمة المرور"
                    placeholderTextColor="#ADB5BD"
                    secureTextEntry={!showPassword}
                    style={[styles.textInput, (!showPassword) && { fontFamily: undefined }]}
                    textAlign="right"
                    value={password}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <Lock color={THEME_NAVY} size={22} style={styles.fieldIcon} />
                </View>
                {!!passError && <Text style={styles.errorText}>{passError}</Text>}
              </View>

              {/* Login Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleLogin}
                style={[styles.loginButton, loading && { opacity: 0.75 }]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={THEME_NAVY} size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
                )}
              </TouchableOpacity>

              {/* Footer Links */}
              <View style={styles.footerLinks}>
                <Link href="/(driver)/forgot-password" asChild>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>نسيت كلمة المرور؟</Text>
                  </TouchableOpacity>
                </Link>
                <Link href="/(driver)/register" asChild>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>إنشاء حساب جديد</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_NAVY },
  header: { height: height * 0.35, justifyContent: 'center', alignItems: 'center' },
  logoWrapper: { alignItems: 'center' },
  logoImage: { width: 60, height: 60, resizeMode: 'contain', marginBottom: 10 },
  brandName: { fontSize: 32, fontWeight: 'bold', color: THEME_YELLOW, letterSpacing: 1 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 40 },
  loginCard: { backgroundColor: WHITE, borderRadius: 35, padding: 30, width: '100%', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 25 },
  roleTitle: { fontSize: 18, fontFamily: 'Cairo-Bold', color: THEME_NAVY, textAlign: 'center', marginBottom: 20 },
  inputContainer: { marginBottom: 20 },
  inputField: { flexDirection: 'row', height: 65, backgroundColor: WHITE, borderRadius: 15, borderWidth: 1.5, borderColor: '#E5E5EA', alignItems: 'center', paddingHorizontal: 15 },
  inputError: { borderColor: '#E53935' },
  errorText: { fontFamily: 'Cairo-Regular', fontSize: 12, color: '#E53935', marginTop: 6, marginLeft: 10 },
  textInput: { flex: 1, fontSize: 18, color: THEME_NAVY, fontWeight: '600', paddingHorizontal: 10, fontFamily: 'Cairo-Regular' },
  fieldIcon: { marginLeft: 10 },
  toggleIcon: { padding: 5 },
  loginButton: { backgroundColor: THEME_YELLOW, height: 65, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 15, shadowColor: THEME_YELLOW, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  loginButtonText: { fontSize: 22, fontWeight: '900', color: THEME_NAVY, fontFamily: 'Cairo-Bold' },
  footerLinks: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 30 },
  linkText: { fontSize: 15, color: THEME_NAVY, fontWeight: '700', fontFamily: 'Cairo-Bold' },
});
