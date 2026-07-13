import ScreenContainer from '../../../components/ScreenContainer';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
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
};

export default function PersonalInfoScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();

  // قراءة البيانات الحالية من الـ Store
  const registeredDriver    = useDriverStore(s => s.registeredDriver);
  const updateDriverProfile = useDriverStore(s => s.updateDriverProfile);

  const [name,  setName]  = useState(registeredDriver?.name  ?? '');
  const [phone, setPhone] = useState(registeredDriver?.phone ?? '');

  const phoneRef = useRef<TextInput>(null);

  // ── حفظ التغييرات في الـ Store ────────────────────────────────────────────
  const handleSave = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('بيانات ناقصة', 'يرجى تعبئة الاسم ورقم الهاتف.');
      return;
    }
    updateDriverProfile(name.trim(), phone.trim());
    Alert.alert('تم الحفظ', 'تم تحديث معلوماتك الشخصية بنجاح.', [
      { text: 'موافق', onPress: () => router.back() },
    ]);
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
          <Ionicons name='chevron-forward' size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المعلومات الشخصية</Text>
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
          {/* الصورة الشخصية */}
          <View style={styles.photoSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                {registeredDriver?.avatarUrl ? (
                  <Image
                    source={{ uri: registeredDriver.avatarUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={60} color="#64748B" />
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.9}>
                <Ionicons name="camera" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity>
              <Text style={styles.updatePhotoText}>تحديث الصورة الشخصية</Text>
            </TouchableOpacity>
          </View>

          {/* الحقول */}
          <View style={styles.formContainer}>
            <AmmarliInput
              label="الاسم الكامل"
              value={name}
              onChangeText={setName}
              iconName="person-outline"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              blurOnSubmit={false}
            />

            <View style={{ marginTop: 15 }}>
              <AmmarliInput
                ref={phoneRef}
                label="رقم الهاتف"
                value={phone}
                onChangeText={setPhone}
                iconName="call-outline"
                keyboardType="phone-pad"
              />
            </View>

            {/* صندوق المعلومات */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
              <Text style={styles.infoText}>
                يتم استخدام هذه المعلومات للتواصل معك وللتحقق من هويتك كشريك قيادة موثوق.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* زر الحفظ الثابت */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={handleSave}>
            <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.primary} />
            <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.white },

  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Cairo-Black', color: COLORS.primary },
  backButton:  {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
  },

  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  // Avatar
  photoSection:    { alignItems: 'center', marginBottom: 35 },
  avatarContainer: { marginBottom: 15 },
  avatarBorder: {
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 3, borderColor: COLORS.secondary,
    padding: 3, justifyContent: 'center', alignItems: 'center',
  },
  avatar:     { width: '100%', height: '100%', borderRadius: 62 },
  cameraBtn:  {
    position: 'absolute', bottom: 0, left: 5,
    backgroundColor: COLORS.white,
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  updatePhotoText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary, opacity: 0.7 },

  // Form
  formContainer: { width: '100%' },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16, padding: 18,
    marginTop: 30, alignItems: 'center', gap: 12,
  },
  infoText: {
    flex: 1, fontSize: 14, fontFamily: 'Cairo-Bold',
    lineHeight: 22, color: COLORS.primary, textAlign: 'left',
  },

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
