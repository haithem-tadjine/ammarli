import React from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, Alert } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useDriverStore } from '../../../src/store/useDriverStore';
import { api } from '../../../src/services/api';

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

  const isOnline = useDriverStore(s => s.isOnline);
  const bgColors = isOnline ? (['#F8FAFC', '#E2E8F0'] as const) : (['#F1F5F9', '#CBD5E1'] as const);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />
      
      {/* Header الموحد */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
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
                <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialCommunityIcons name="account" size={50} color={COLORS.textSecondary} />
                </View>
              )}
            </View>
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.primary} />
            </View>
          </View>
          
          <Text style={styles.userName}>{driverName}</Text>
          <BlurView intensity={40} tint="light" style={styles.ratingRow}>
            <Text style={styles.statusText}>موثق</Text>
            <View style={styles.dot} />
            <Text style={styles.ratingText}>{driverRating}</Text>
            <Ionicons name="star" size={16} color={COLORS.secondary} style={{marginRight: 4}} />
          </BlurView>
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
          {(registeredDriver?.driverType === 'Tanker' || registeredDriver?.driverType === 'Bottled') && (
            <MenuItem 
              icon="cash-fast" 
              label="التسعير السريع (Fast Accept)" 
              subLabel="تحديد الأسعار الافتراضية لقبول الطلبات المباشر" 
              onPress={() => router.push('/(driver)/settings/pricing' as any)}
            />
          )}
          <MenuItem 
            icon="help-circle-outline" 
            label="المساعدة والدعم" 
            subLabel="الأسئلة الشائعة والتواصل" 
            onPress={() => router.push('/(driver)/settings/help-support' as any)}
          />
          <MenuItem 
            icon="shield-check-outline" 
            label="سياسة الخصوصية" 
            subLabel="كيفية حماية بياناتك واستخدامها" 
            onPress={() => router.push('/(driver)/privacy' as any)}
          />
        </View>

        {/* Logout Action */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <BlurView intensity={70} tint="light" style={styles.logoutBlur}>
             <View style={styles.logoutIconBox}>
               <MaterialCommunityIcons name="logout" size={22} color={COLORS.danger} />
             </View>
             <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </BlurView>
        </TouchableOpacity>

        {/* Delete Account Action */}
        <TouchableOpacity style={[styles.logoutButton, { marginTop: 0 }]} onPress={handleDeleteAccount} activeOpacity={0.8}>
          <BlurView intensity={70} tint="light" style={styles.logoutBlur}>
             <View style={[styles.logoutIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
               <MaterialCommunityIcons name="delete-outline" size={22} color={COLORS.danger} />
             </View>
             <Text style={styles.logoutText}>حذف الحساب نهائياً</Text>
          </BlurView>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const MenuItem = ({ icon, label, subLabel, onPress }: any) => (
  <TouchableOpacity style={styles.menuItemWrap} activeOpacity={0.7} onPress={onPress}>
    <BlurView intensity={70} tint="light" style={styles.menuItem}>
       <View style={styles.menuIconBox}>
         <MaterialCommunityIcons name={icon} size={24} color={COLORS.primary} />
       </View>
       <View style={styles.menuContent}>
         <Text style={styles.menuLabel}>{label}</Text>
         <Text style={styles.menuSubLabel}>{subLabel}</Text>
       </View>
       <Ionicons name='chevron-forward' size={18} color="#94A3B8" />
    </BlurView>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: COLORS.primary },
  scrollContent: { paddingVertical: 10 },
  
  profileHero: { alignItems: 'center', paddingVertical: 25 },
  avatarContainer: { marginBottom: 15, elevation: 4, shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 15 },
  avatarBorder: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: COLORS.white, padding: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  avatar: { width: '100%', height: '100%', borderRadius: 50 },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.white, borderRadius: 12, padding: 2, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  userName: { fontSize: 28, fontFamily: 'Cairo-Black', color: COLORS.primary, marginBottom: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  ratingText: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', marginHorizontal: 10 },
  statusText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  userRole: { fontSize: 15, fontFamily: 'Cairo-Bold', color: '#64748B' },
  
  menuContainer: { paddingHorizontal: 20, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left', marginBottom: 15 },
  menuItemWrap: { marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  menuIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(0,33,71,0.06)', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  menuContent: { flex: 1, alignItems: 'flex-start' },
  menuLabel: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary },
  menuSubLabel: { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: '#64748B', marginTop: 2 },
  
  logoutButton: { marginHorizontal: 20, marginTop: 15, marginBottom: 20 },
  logoutBlur: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(254, 242, 242, 0.75)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(254, 202, 202, 0.6)', overflow: 'hidden' },
  logoutIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  logoutText: { fontSize: 17, fontFamily: 'Cairo-Black', color: COLORS.danger, flex: 1, textAlign: 'left' },
});

export default DriverProfileScreen;
