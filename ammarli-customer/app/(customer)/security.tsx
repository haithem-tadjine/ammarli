import ScreenContainer from '../../components/ScreenContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [errors, setErrors] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    let hasError = false;
    let newErrors = { old: false, new: false, confirm: false };

    if (!oldPassword.trim()) {
      newErrors.old = true;
      hasError = true;
    }
    if (!newPassword.trim()) {
      newErrors.new = true;
      hasError = true;
    }
    if (!confirmPassword.trim() || newPassword !== confirmPassword) {
      newErrors.confirm = true;
      hasError = true;
    }

    setErrors(newErrors);

    if (!hasError) {
      try {
        await api.post('/users/me/change-password', {
          oldPassword,
          newPassword
        });
        // Show success modal
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          router.back();
        }, 2500);
      } catch (e) {
        // Here you might handle a 400 if the old password was wrong
        alert('حدث خطأ أثناء تغيير كلمة المرور');
      }
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-right" size={24} color="#012047" />
        </TouchableOpacity>
        <Text style={styles.title}>تغيير كلمة السر</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior="padding"
        style={{ flex: 1 }}
       keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.instructionText}>
            الرجاء إدخال كلمة السر القديمة ثم تعيين كلمة السر الجديدة الخاصة بك لحماية حسابك.
          </Text>

          {/* Old Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة السر القديمة</Text>
            <View style={[styles.inputContainer, errors.old && styles.inputError, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
              <TouchableOpacity onPress={() => setShowOldPass(!showOldPass)} style={styles.eyeBtn}>
                <Feather name={showOldPass ? "eye-off" : "eye"} size={20} color="#8E8E93" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                secureTextEntry={!showOldPass}
                value={oldPassword}
                onChangeText={(text) => {
                  setOldPassword(text);
                  if (errors.old) setErrors(prev => ({ ...prev, old: false }));
                }}
                placeholder="********"
                placeholderTextColor="#A0AEC0"
                textAlign="right"
              />
              <Feather name="lock" size={20} color="#012047" style={styles.inputIcon} />
            </View>
            {errors.old && <Text style={styles.errorText}>يرجى إدخال كلمة السر القديمة</Text>}
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة السر الجديدة</Text>
            <View style={[styles.inputContainer, errors.new && styles.inputError]}>
              <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
                <Feather name={showNewPass ? "eye-off" : "eye"} size={20} color="#8E8E93" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                secureTextEntry={!showNewPass}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.new) setErrors(prev => ({ ...prev, new: false }));
                }}
                placeholder="********"
                placeholderTextColor="#A0AEC0"
                textAlign="right"
              />
              <Feather name="lock" size={20} color="#012047" style={styles.inputIcon} />
            </View>
            {errors.new && <Text style={styles.errorText}>يرجى إدخال كلمة السر الجديدة</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>تأكيد كلمة السر الجديدة</Text>
            <View style={[styles.inputContainer, errors.confirm && styles.inputError]}>
              <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} style={styles.eyeBtn}>
                <Feather name={showConfirmPass ? "eye-off" : "eye"} size={20} color="#8E8E93" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                secureTextEntry={!showConfirmPass}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirm) setErrors(prev => ({ ...prev, confirm: false }));
                }}
                placeholder="********"
                placeholderTextColor="#A0AEC0"
                textAlign="right"
              />
              <Feather name="check-circle" size={20} color="#012047" style={styles.inputIcon} />
            </View>
            {errors.confirm && <Text style={styles.errorText}>كلمة السر غير متطابقة</Text>}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>تغيير وحفظ</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={70} color="#34C759" />
            </View>
            <Text style={styles.successTitle}>تم تغيير كلمة السر بنجاح</Text>
            <Text style={styles.successDesc}>تم تغيير وتحديث كلمة السر الخاصة بك بنجاح، يمكنك الآن استخدامها للدخول إلى حسابك.</Text>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', 
    padding: 20, borderBottomWidth: 1, borderColor: '#F2F2F7', backgroundColor: '#FFF' 
  },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontFamily: 'Cairo-Bold', color: '#012047' },
  content: { padding: 25 },
  instructionText: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: '#8E8E93',
    textAlign: 'left',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#012047',
    marginBottom: 8,
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F8F9FA',
    height: 60,
    paddingHorizontal: 15,
  },
  inputError: {
    borderColor: '#E63946',
    backgroundColor: '#FFF5F5',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: '#012047',
  },
  inputIcon: {
    marginLeft: 10,
  },
  eyeBtn: {
    padding: 10,
  },
  errorText: {
    color: '#E63946',
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'left',
    marginTop: 6,
  },
  saveBtn: {
    backgroundColor: '#FFCC00',
    borderRadius: 18,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 4,
    shadowColor: '#FFCC00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBtnText: {
    color: '#012047',
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successCard: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 28,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  successIconBox: {
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#012047',
    marginBottom: 10,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  }
});
