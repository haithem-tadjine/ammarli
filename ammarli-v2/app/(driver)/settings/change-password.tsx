import ScreenContainer from '../../../components/ScreenContainer';
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AmmarliInput from '../../../components/AmmarliInput';
import { useDriverStore } from '../../../src/store/useDriverStore';

const COLORS = {
  primary:       '#002147',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  background:    '#F8FAFC',
  textSecondary: '#64748B',
  border:        '#E2E8F0',
  danger:        '#EF4444',
  dangerBg:      '#FEF2F2',
  success:       '#22C55E',
  successBg:     '#F0FDF4',
};

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const registeredDriver = useDriverStore(s => s.registeredDriver);
  const updatePassword   = useDriverStore(s => s.updatePassword);

  const [oldPass,     setOldPass]     = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [success,     setSuccess]     = useState(false);

  const newRef     = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // ── التحقق والحفظ ─────────────────────────────────────────────────────────
  const handleSave = () => {
    const errs: Record<string, string> = {};

    if (!oldPass) {
      errs.old = 'يرجى إدخال كلمة المرور الحالية';
    } else if (oldPass !== registeredDriver?.password) {
      errs.old = 'كلمة المرور الحالية غير صحيحة';
    }

    if (!newPass) {
      errs.new = 'يرجى إدخال كلمة المرور الجديدة';
    } else if (newPass.length < 6) {
      errs.new = 'يجب أن تكون 6 أحرف على الأقل';
    } else if (newPass === oldPass) {
      errs.new = 'كلمة المرور الجديدة يجب أن تختلف عن الحالية';
    }

    if (!confirmPass) {
      errs.confirm = 'يرجى تأكيد كلمة المرور';
    } else if (confirmPass !== newPass) {
      errs.confirm = 'كلمتا المرور غير متطابقتين';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // الحفظ في الـ Store
    updatePassword(newPass);
    setSuccess(true);
    setOldPass('');
    setNewPass('');
    setConfirmPass('');

    setTimeout(() => {
      router.back();
    }, 1800);
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name='chevron-forward' size={26} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تغيير كلمة المرور</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
       keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* رسالة النجاح */}
          {success && (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.success} />
              <Text style={styles.successText}>تم تغيير كلمة المرور بنجاح!</Text>
            </View>
          )}

          {/* الوصف */}
          <View style={styles.descBox}>
            <MaterialCommunityIcons name="shield-lock-outline" size={40} color={COLORS.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.descTitle}>أمان حسابك يهمنا</Text>
            <Text style={styles.descSub}>
              استخدم كلمة مرور قوية تحتوي على أحرف وأرقام لحماية حسابك.
            </Text>
          </View>

          {/* الحقول */}
          <View style={styles.formContainer}>
            {/* كلمة المرور الحالية */}
            <AmmarliInput
              label="كلمة المرور الحالية"
              placeholder="••••••••"
              iconName="lock-closed-outline"
              value={oldPass}
              onChangeText={(t: string) => { setOldPass(t); setErrors(e => ({ ...e, old: '' })); }}
              secureTextEntry
              isPassword
              returnKeyType="next"
              onSubmitEditing={() => newRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.old ? <Text style={styles.errorText}>{errors.old}</Text> : null}

            <View style={{ marginTop: 15 }}>
              <AmmarliInput
                ref={newRef}
                label="كلمة المرور الجديدة"
                placeholder="••••••••"
                iconName="lock-open-outline"
                value={newPass}
                onChangeText={(t: string) => { setNewPass(t); setErrors(e => ({ ...e, new: '' })); }}
                secureTextEntry
                isPassword
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              {errors.new ? <Text style={styles.errorText}>{errors.new}</Text> : null}
            </View>

            <View style={{ marginTop: 15 }}>
              <AmmarliInput
                ref={confirmRef}
                label="تأكيد كلمة المرور"
                placeholder="••••••••"
                iconName="checkmark-circle-outline"
                value={confirmPass}
                onChangeText={(t: string) => { setConfirmPass(t); setErrors(e => ({ ...e, confirm: '' })); }}
                secureTextEntry
                isPassword
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}
            </View>

            {/* مؤشر قوة كلمة المرور */}
            {newPass.length > 0 && (
              <View style={styles.strengthContainer}>
                <Text style={styles.strengthLabel}>قوة كلمة المرور</Text>
                <View style={styles.strengthBar}>
                  <View style={[
                    styles.strengthFill,
                    {
                      width: newPass.length >= 10 ? '100%' : newPass.length >= 7 ? '66%' : '33%',
                      backgroundColor: newPass.length >= 10 ? COLORS.success : newPass.length >= 7 ? COLORS.secondary : COLORS.danger,
                    }
                  ]} />
                </View>
                <Text style={[styles.strengthValue, {
                  color: newPass.length >= 10 ? COLORS.success : newPass.length >= 7 ? '#D97706' : COLORS.danger,
                }]}>
                  {newPass.length >= 10 ? 'قوية' : newPass.length >= 7 ? 'متوسطة' : 'ضعيفة'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* زر الحفظ */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={handleSave}>
            <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.primary} />
            <Text style={styles.saveButtonText}>تغيير كلمة المرور</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    height: 65, backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomRightRadius: 25, borderBottomLeftRadius: 25,
    elevation: 10,
  },
  headerTitle: { fontSize: 19, fontFamily: 'Cairo-Black', color: COLORS.white },
  backButton:  { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 30 },

  // Success banner
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.successBg,
    borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  successText: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.success, textAlign: 'left' },

  // Description box
  descBox: {
    backgroundColor: COLORS.white, borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 25,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  descTitle: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary, marginBottom: 8 },
  descSub:   { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Form
  formContainer: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, marginBottom: 10, elevation: 2 },
  errorText:     { fontSize: 12, fontFamily: 'Cairo-Bold', color: COLORS.danger, textAlign: 'left', marginTop: 6, marginBottom: -4 },

  // Strength indicator
  strengthContainer: { marginTop: 16 },
  strengthLabel:     { fontSize: 12, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary, textAlign: 'left', marginBottom: 8 },
  strengthBar:       { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  strengthFill:      { height: '100%', borderRadius: 3 },
  strengthValue:     { fontSize: 12, fontFamily: 'Cairo-Black', textAlign: 'left', marginTop: 6 },

  // Footer
  footer:     { paddingHorizontal: 24, paddingTop: 10 },
  saveButton: {
    backgroundColor: COLORS.secondary, height: 64, borderRadius: 32,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 12, elevation: 8,
    shadowColor: COLORS.secondary, shadowOpacity: 0.3, shadowRadius: 15,
  },
  saveButtonText: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
});
