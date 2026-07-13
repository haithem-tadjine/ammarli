import ScreenContainer from '../../components/ScreenContainer';
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
  Platform,
  I18nManager,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { 
  User, 
  Lock, 
  Trash2, 
  HelpCircle, 
  FileText, 
  LogOut, 
  ChevronLeft,
  Camera,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { api } from '../../src/services/api';

const { width, height } = Dimensions.get('window');

// تفعيل اتجاه اليمين لليسار
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const THEME_NAVY = '#012047';
const THEME_YELLOW = '#FFCC00';

const SettingsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile, logout } = useAuthStore();
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const userData = {
    name: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'ضيف',
    image: 'https://randomuser.me/api/portraits/men/32.jpg'
  };

  const handleLogout = () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد أنك تريد تسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        { 
          text: "خروج", 
          style: "destructive", 
          onPress: async () => {
            await logout();
            router.replace('/(customer)/login');
          } 
        }
      ]
    );
  };

  const handleDeleteAccountRequest = () => {
    Alert.alert(
      "تأكيد حذف الحساب",
      "هل أنت متأكد أنك تريد حذف حسابك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
      [
        { text: "إلغاء", style: "cancel" },
        { 
          text: "موافق", 
          style: "destructive", 
          onPress: () => setDeleteModalVisible(true) 
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!password) {
      Alert.alert("خطأ", "الرجاء إدخال كلمة المرور للمتابعة");
      return;
    }
    
    try {
      if (userProfile?.id) {
        await api.delete(`/users/${userProfile.id}`);
      }
      setDeleteModalVisible(false);
      setPassword('');
      
      Alert.alert("تم حذف الحساب", "لقد تم حذف حسابك بنجاح.", [
        {
          text: "موافق",
          onPress: async () => {
            await logout();
            router.replace('/(customer)/login');
          }
        }
      ]);
    } catch (e) {
      Alert.alert("خطأ", "حدث خطأ أثناء محاولة حذف الحساب");
    }
  };

  const SettingItem = ({ icon: Icon, title, isDestructive = false, onPress }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <ChevronLeft color="#8E8E93" size={20} />
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemText, isDestructive && { color: '#E63946' }]}>{title}</Text>
        <Icon color={isDestructive ? "#E63946" : THEME_NAVY} size={22} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F2F5" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>

          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ChevronRight color="#012047" size={28} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>الإعدادات</Text>
            <View style={{ width: 28 }} />
          </View>
      </View>

      <View style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
          
          {/* قسم الملف الشخصي (ملء الفراغ العلوي) */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: userData.image }} style={styles.avatarImage} />
              <View style={styles.cameraBadge}>
                <Camera color="#FFF" size={14} />
              </View>
            </View>
            <Text style={styles.profileName}>{userData.name}</Text>
          </View>

          {/* بطاقة الحساب (موسعة) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>الحساب</Text>
            <SettingItem 
              icon={User} 
              title="تعديل الملف الشخصي" 
              onPress={() => router.push('/(customer)/edit-profile')} 
            />
            <SettingItem 
              icon={Lock} 
              title="تغيير كلمة المرور" 
              onPress={() => router.push('/(customer)/security')} 
            />
            <SettingItem 
              icon={Trash2} 
              title="حذف الحساب" 
              isDestructive={true} 
              onPress={handleDeleteAccountRequest} 
            />
          </View>

          {/* بطاقة حول (موسعة) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>حول</Text>
            <SettingItem 
              icon={HelpCircle} 
              title="مركز المساعدة" 
              onPress={() => router.push('/(customer)/help')} 
            />
            <SettingItem 
              icon={FileText} 
              title="سياسة الخصوصية" 
              onPress={() => router.push('/(customer)/privacy')} 
            />
          </View>

          {/* زر تسجيل الخروج الفخم */}
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Ammarli App v1.0.0</Text>
        </ScrollView>
      </View>

      {/* مودال تأكيد الحذف */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Trash2 color="#E63946" size={32} />
              </View>
              <Text style={styles.modalTitle}>تأكيد الحذف</Text>
              <Text style={styles.modalSubtitle}>يرجى إدخال كلمة المرور لتأكيد حذف حسابك نهائياً.</Text>
            </View>

            <View style={styles.inputContainer}>
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff color="#ADB5BD" size={20} />
                ) : (
                  <Eye color="#ADB5BD" size={20} />
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.passwordInput}
                placeholder="كلمة المرور"
                placeholderTextColor="#ADB5BD"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                textAlign="right"
              />
              <Lock color={THEME_NAVY} size={20} style={styles.inputIcon} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { paddingTop: insets.top, paddingBottom: insets.bottom }]} 
                onPress={() => {
                  setDeleteModalVisible(false);
                  setPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.confirmButtonText}>حذف الحساب</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5', // خلفية رمادية فاتحة جداً لإبراز البطاقات
  },
  header: {
    paddingBottom: 15,
    // paddingTop is set dynamically via inline style using insets.top
    backgroundColor: '#F0F2F5',
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#012047',
  },
  backButton: {
    padding: 5,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center', // توسيط المحتوى لملء الفراغ بشكل متوازن
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrapper: {
    position: 'relative',
    padding: 4,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#FFCC00',
    backgroundColor: '#FFF',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#012047',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#012047',
    marginTop: 15,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 28, // زوايا دائرية كبيرة للفخامة
    padding: 25, // مساحات داخلية واسعة لملء الفراغ
    marginBottom: 25,
    elevation: 8, // ظل قوي للأندرويد
    shadowColor: '#000', // ظل للـ iOS
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#8E8E93',
    textAlign: 'left',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  menuItemContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuItemText: {
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
    color: '#012047',
    marginRight: 15,
  },
  logoutButton: {
    backgroundColor: '#FFCC00',
    width: '100%',
    height: 65,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    elevation: 6,
    shadowColor: '#FFCC00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  logoutText: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#012047',
  },
  versionText: {
    textAlign: 'center',
    color: '#ADB5BD',
    marginTop: 30,
    fontSize: 13,
    fontFamily: 'Cairo-Bold',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 24,
    padding: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#012047',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: '#8E8E93',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#012047',
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginLeft: 10,
  },
  eyeIcon: {
    padding: 5,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
  },
  confirmButton: {
    backgroundColor: '#E63946',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#012047',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#FFF',
  }
});

export default SettingsScreen;
