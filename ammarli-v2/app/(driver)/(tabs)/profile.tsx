import React from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useDriverStore } from '../../../src/store/useDriverStore';

const COLORS = {
  primary: '#003366',
  secondary: '#F3CD0D',
  white: '#FFFFFF',
  background: '#F8FAFC',
  textSecondary: '#64748B',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  border: '#F1F5F9',
  accentLight: '#F3CD0D15',
};

const DriverProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logout = useAuthStore(state => state.logout);

  // قراءة بيانات السائق من Store
  const registeredDriver = useDriverStore(s => s.registeredDriver);
  const driverName = registeredDriver?.name ?? 'السائق';
  const driverRole = registeredDriver?.driverType === 'Bottled'
    ? 'موصل قوارير متميز'
    : registeredDriver?.waterType === 'spring'       ? 'سائق مياه الينابيع'
    : registeredDriver?.waterType === 'well'         ? 'سائق مياه الآبار'
    : registeredDriver?.waterType === 'construction' ? 'سائق مياه البناء'
    : 'سائق صهاريج متميز';

  const driverRating = useDriverStore(s => s.driverRating);
  const userProfile = useAuthStore(s => s.userProfile);

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace('/(driver)/login' as any);
  };

  return (
    <ScreenContainer backgroundColor="#FFF" statusBarStyle="dark-content" statusBarColor="#FFF">
      <StatusBar barStyle="dark-content" />
      
      {/* Header الموحد */}
      <View style={styles.header}>
        <View style={{ width: 44 }} /> 
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
        
        {/* Profile Hero Section */}
        <View style={styles.profileHero}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBorder}>
              {userProfile?.avatarUrl ? (
                <Image 
                  source={{ uri: userProfile.avatarUrl }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialCommunityIcons name="account" size={50} color={COLORS.textSecondary} />
                </View>
              )}
            </View>
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.primary} />
            </View>
          </View>
          
          <Text style={styles.userName}>{driverName}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.statusText}>موثق</Text>
            <View style={styles.dot} />
            <Text style={styles.ratingText}>{driverRating}</Text>
            <Ionicons name="star" size={16} color={COLORS.secondary} style={{marginRight: 4}} />
          </View>
          <Text style={styles.userRole}>{driverRole}</Text>
        </View>

        {/* Settings Menu */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>إعدادات الحساب</Text>
          
          <MenuItem 
            icon="account-outline" 
            label="المعلومات الشخصية" 
            subLabel="الاسم، البريد الإلكتروني، الهاتف" 
            onPress={() => router.push('/(driver)/settings/personal-info' as any)}
          />
          <MenuItem 
            icon="cog-outline" 
            label="إعدادات التطبيق" 
            subLabel="السمة، الإشعارات، اللغة" 
            onPress={() => router.push('/(driver)/settings/app-settings' as any)}
          />
          <MenuItem 
            icon="help-circle-outline" 
            label="المساعدة والدعم" 
            subLabel="الأسئلة الشائعة والتواصل" 
            onPress={() => router.push('/(driver)/settings/help-support' as any)}
          />
        </View>

        {/* Logout Action */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={styles.logoutIconBox}>
            <MaterialCommunityIcons name="logout" size={22} color={COLORS.danger} />
          </View>
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const MenuItem = ({ icon, label, subLabel, onPress }: any) => (
  <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.menuIconBox}>
      <MaterialCommunityIcons name={icon} size={24} color={COLORS.primary} />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuSubLabel}>{subLabel}</Text>
    </View>
    <Ionicons name='chevron-forward' size={18} color="#CBD5E1" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, height: 60, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
  scrollContent: { paddingVertical: 10 },
  profileHero: { alignItems: 'center', paddingVertical: 25 },
  avatarContainer: { marginBottom: 15 },
  avatarBorder: { width: 105, height: 105, borderRadius: 52, borderWidth: 3, borderColor: COLORS.secondary, padding: 3 },
  avatar: { width: '100%', height: '100%', borderRadius: 48 },
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: COLORS.secondary, borderRadius: 12, padding: 3, borderWidth: 2, borderColor: COLORS.white },
  userName: { fontSize: 28, fontFamily: 'Cairo-Black', color: COLORS.primary, marginBottom: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  ratingText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 10 },
  statusText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  userRole: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary },
  menuContainer: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left', marginBottom: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 15, borderRadius: 20, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10 },
  menuIconBox: { width: 45, height: 45, borderRadius: 14, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  menuContent: { flex: 1, alignItems: 'flex-start' },
  menuLabel: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  menuSubLabel: { fontSize: 11, fontFamily: 'Cairo-Regular', color: COLORS.textSecondary, marginTop: 2 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 15, backgroundColor: COLORS.dangerBg, padding: 15, borderRadius: 20 },
  logoutIconBox: { width: 45, height: 45, borderRadius: 14, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  logoutText: { fontSize: 17, fontFamily: 'Cairo-Black', color: COLORS.danger, flex: 1, textAlign: 'left' },
});

export default DriverProfileScreen;
