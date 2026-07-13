import ScreenContainer from '../../../components/ScreenContainer';
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/useAuthStore';

const { width } = Dimensions.get('window');
const THEME_NAVY = '#012047';
const THEME_YELLOW = '#FFCC00';

export default function MyAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Get real user data from store
  const userProfile = useAuthStore((s) => s.userProfile);
  const logout = useAuthStore((s) => s.logout);
  
  const userName = userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'ضيف';
  const userRating = '4.8'; // Mock rating

  const handleLogout = () => {
    // Only works natively, but for Web we can just execute the action directly or use a web-compatible confirm
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('هل أنت متأكد أنك تريد تسجيل الخروج؟');
      if (confirmLogout) {
        performLogout();
      }
    } else {
      Alert.alert(
        "تسجيل الخروج",
        "هل أنت متأكد أنك تريد تسجيل الخروج؟",
        [
          { text: "إلغاء", style: "cancel" },
          { 
            text: "خروج", 
            style: "destructive", 
            onPress: performLogout 
          }
        ]
      );
    }
  };

  const performLogout = async () => {
    await logout();
    router.replace('/(customer)/login');
  };

  // MenuItem sub-component
  const MenuItem = ({ iconName, title, onPress, isLogout = false }: any) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Feather name="chevron-left" color="#8E8E93" size={20} />
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemText, isLogout && { color: '#FF3B30' }]}>{title}</Text>
        <View style={styles.menuIconContainer}>
          <Feather name={iconName} color={isLogout ? "#FF3B30" : THEME_NAVY} size={22} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar hidden={false} barStyle="dark-content" />

      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}>
          
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{userRating}</Text>
                <Feather name="star" color={THEME_NAVY} size={12} style={{ fill: THEME_NAVY } as any} />
              </View>
            </View>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" color="#ADB5BD" size={40} />
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(customer)/settings' as any)}
            >
              <Feather name="settings" color={THEME_NAVY} size={32} />
              <Text style={styles.actionText}>الإعدادات</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(customer)/help' as any)}
            >
              <Feather name="help-circle" color={THEME_NAVY} size={32} />
              <Text style={styles.actionText}>المساعدة</Text>
            </TouchableOpacity>
          </View>

          {/* Settings Menu */}
          <View style={styles.menuContainer}>
            <MenuItem 
              iconName="user" 
              title="تعديل الملف الشخصي" 
              onPress={() => router.push('/(customer)/edit-profile' as any)} 
            />

            <MenuItem 
              iconName="shield" 
              title="الأمان" 
              onPress={() => router.push('/(customer)/security' as any)} 
            />
            <MenuItem 
              iconName="lock" 
              title="الخصوصية" 
              onPress={() => router.push('/(customer)/privacy' as any)} 
            />
            
            <View style={styles.divider} />
            
            <MenuItem 
              iconName="log-out" 
              title="تسجيل الخروج" 
              onPress={handleLogout} 
              isLogout={true} 
            />
          </View>

        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  safeArea: { flex: 1 },
  scrollContent: {},
  
  profileHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginTop: 40,
    marginBottom: 30,
  },
  userInfo: { alignItems: 'flex-end', marginRight: 15 },
  userName: { fontSize: 32, fontFamily: 'Cairo-Bold', color: THEME_NAVY },
  ratingBadge: {
    flexDirection: 'row-reverse',
    backgroundColor: THEME_YELLOW,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: { fontSize: 14, fontFamily: 'Cairo-Bold', marginRight: 4, color: THEME_NAVY },
  avatarContainer: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#F2F2F7',
    justifyContent: 'center', alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10,
  },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1D1D6',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  
  quickActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 35,
  },
  actionCard: {
    backgroundColor: '#FFF',
    // 45 = 15 padding on both sides + 15 space in the middle
    width: (width - 45) / 2,
    height: 110,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderBottomWidth: 4,
    borderBottomColor: THEME_YELLOW,
  },
  actionText: { marginTop: 10, fontSize: 14, fontFamily: 'Cairo-Bold', color: THEME_NAVY },
  
  menuContainer: { paddingHorizontal: 20 },
  menuItem: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  menuItemContent: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  menuItemText: { fontSize: 17, fontFamily: 'Cairo-SemiBold', color: THEME_NAVY, marginRight: 15 },
  menuIconContainer: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginVertical: 10 },
});
