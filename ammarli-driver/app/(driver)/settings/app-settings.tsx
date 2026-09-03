import ScreenContainer from '../../../components/ScreenContainer';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Switch, Alert, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../../src/services/api';
import { useAuthStore } from '../../../src/store/useAuthStore';

const COLORS = {
  primary:       '#002147',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  background:    '#F8FAFC',
  textSecondary: '#64748B',
  border:        '#F1F5F9',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SettingItem = ({ icon, label, subLabel, showArrow, onPress }: any) => (
  <TouchableOpacity style={styles.itemRow} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
    </View>
    <View style={styles.labelContainer}>
      <Text style={styles.itemLabel}>{label}</Text>
      {subLabel && <Text style={styles.itemSubLabel}>{subLabel}</Text>}
    </View>
    {showArrow && <Ionicons name='chevron-back' size={18} color="#CBD5E1" />}
  </TouchableOpacity>
);

const SettingToggle = ({ icon, label, value, onValueChange }: any) => (
  <View style={styles.itemRow}>
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons name={icon} size={24} color={COLORS.primary} />
    </View>
    <Text style={styles.itemLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#E2E8F0', true: COLORS.secondary }}
      thumbColor={COLORS.white}
      style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
    />
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

const AppSettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [twoFactor,   setTwoFactor]   = useState(true);
  const [orderNotifs, setOrderNotifs] = useState(true);
  const [alertSounds, setAlertSounds] = useState(false);
  
  const userProfile = useAuthStore(s => s.userProfile);
  const logout = useAuthStore(s => s.logout);

  const handleDeleteAccount = () => {
    Alert.alert(
      'حذف الحساب بشكل نهائي',
      'هل أنت متأكد أنك تريد حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه وسيتم مسح جميع بياناتك.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف حسابي',
          style: 'destructive',
          onPress: async () => {
            try {
              if (userProfile?.id) {
                await api.delete(`/users/${userProfile.id}`);
              }
              await logout();
              router.replace('/(driver)/login' as any);
            } catch (err) {
              Alert.alert('خطأ', 'حدث خطأ أثناء محاولة حذف الحساب.');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTwoFactor = await AsyncStorage.getItem('@settings_twoFactor');
        const storedOrderNotifs = await AsyncStorage.getItem('@settings_orderNotifs');
        const storedAlertSounds = await AsyncStorage.getItem('@settings_alertSounds');
        
        if (storedTwoFactor !== null) setTwoFactor(storedTwoFactor === 'true');
        if (storedOrderNotifs !== null) setOrderNotifs(storedOrderNotifs === 'true');
        if (storedAlertSounds !== null) setAlertSounds(storedAlertSounds === 'true');
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    loadSettings();
  }, []);

  const toggleSwitch = async (setter: Function, value: boolean, key: string) => {
    const newValue = !value;
    setter(newValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await AsyncStorage.setItem(key, String(newValue));
    } catch (e) {
      console.error('Failed to save setting', e);
    }
  };

  const handleTwoFactorToggle = () => {
    Alert.alert('المصادقة الثنائية', 'سيتم توفير ميزة رسائل الـ SMS للمصادقة الثنائية في التحديث القادم لحماية إضافية لحسابك.');
    toggleSwitch(setTwoFactor, twoFactor, '@settings_twoFactor');
  };

  const openDeviceSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert('خطأ', 'تعذر فتح إعدادات الجهاز');
    });
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name='chevron-forward' size={26} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات والأمان</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* الأمان */}
        <Text style={styles.sectionTitle}>الأمان</Text>
        <View style={styles.card}>
          <SettingItem
            icon="lock-closed-outline"
            label="تغيير كلمة المرور"
            showArrow
            onPress={() => router.push('/(driver)/settings/change-password' as any)}
          />
          <View style={styles.divider} />
          <SettingToggle
            icon="shield-check-outline"
            label="المصادقة الثنائية"
            value={twoFactor}
            onValueChange={handleTwoFactorToggle}
          />
        </View>

        {/* التنبيهات */}
        <Text style={styles.sectionTitle}>التنبيهات</Text>
        <View style={styles.card}>
          <SettingToggle
            icon="truck-outline"
            label="إشعارات الطلبات"
            value={orderNotifs}
            onValueChange={() => toggleSwitch(setOrderNotifs, orderNotifs, '@settings_orderNotifs')}
          />
          <View style={styles.divider} />
          <SettingToggle
            icon="volume-high-outline"
            label="أصوات التنبيه"
            value={alertSounds}
            onValueChange={() => toggleSwitch(setAlertSounds, alertSounds, '@settings_alertSounds')}
          />
        </View>

        {/* الخصوصية */}
        <Text style={styles.sectionTitle}>الخصوصية والحساب</Text>
        <View style={styles.card}>
          <SettingItem
            icon="location-outline"
            label="الوصول إلى الموقع"
            subLabel="مفعل دائماً (اضغط للتعديل)"
            showArrow
            onPress={openDeviceSettings}
          />
          <View style={styles.divider} />
          <TouchableOpacity style={styles.itemRow} activeOpacity={0.7} onPress={handleDeleteAccount}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <MaterialCommunityIcons name="delete-outline" size={22} color="#EF4444" />
            </View>
            <View style={styles.labelContainer}>
              <Text style={[styles.itemLabel, { color: '#EF4444' }]}>حذف الحساب نهائياً</Text>
            </View>
            <Ionicons name='chevron-back' size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 65, backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomRightRadius: 25, borderBottomLeftRadius: 25,
    elevation: 10,
  },
  headerTitle:    { fontSize: 19, fontFamily: 'Cairo-Black', color: COLORS.white },
  backButton:     { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scrollContent:  { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 40 },
  sectionTitle:   { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left', marginBottom: 12, marginTop: 10 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 20, marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  itemRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 14 },
  iconContainer:  { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  labelContainer: { flex: 1, alignItems: 'flex-start' },
  itemLabel:      { flex: 1, fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary, textAlign: 'left' },
  itemSubLabel:   { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },
  divider:        { height: 1, backgroundColor: COLORS.border, marginHorizontal: 15 },
});

export default AppSettingsScreen;
