import ScreenContainer from '../../components/ScreenContainer';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Image,
  Platform,
  I18nManager,
  KeyboardAvoidingView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { User, Phone, MapPin, Camera, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';

const { width } = Dimensions.get('window');
const THEME_NAVY = '#012047';
const THEME_YELLOW = '#FFCC00';

// تفعيل اتجاه اليمين لليسار
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const EditProfileAlgerian = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile, updateUserProfile } = useAuthStore();
  
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [selectedProvince, setSelectedProvince] = useState(userProfile?.wilaya || 'الجزائر العاصمة');

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setPhone(userProfile.phone);
      if (userProfile.wilaya) {
        setSelectedProvince(userProfile.wilaya);
      }
    }
  }, [userProfile]);

  const handleSave = async () => {
    await updateUserProfile({
      firstName,
      lastName,
      phone,
      wilaya: selectedProvince
    });
    router.back();
  };

  // قائمة عينة لولايات الجزائر (يمكنك إكمال الـ 58 ولاية)
  const algerianProvinces = [
    'أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية', 'بسكرة', 'بشار', 'البليدة', 'البويرة', 
    'تمنراست', 'تبسة', 'تلمسان', 'تيارت', 'تيزي وزو', 'الجزائر العاصمة', 'الجلفة', 'جيجل', 'سطيف', 
    'سعيدة', 'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة', 'قسنطينة', 'المدية', 'مستغانم', 'المسيلة', 
    'معسكر', 'ورقلة', 'وهران'
  ];

  return (
    <ScreenContainer style={styles.container}>
      {/* إخفاء شريط الحالة لمظهر نظيف */}
      <StatusBar barStyle="light-content" backgroundColor={THEME_NAVY} />

      {/* الترويسة (Header) */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>

          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ChevronRight color="#FFF" size={28} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>تعديل الملف الشخصي</Text>
            <View style={{ width: 28 }} />
          </View>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* قسم الصورة الشخصية */}
        <View style={styles.photoContainer}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
              style={styles.avatarImage} 
            />
            <TouchableOpacity style={styles.cameraIcon}>
              <Camera color="#FFF" size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* الحقول (Form) */}
        <View style={styles.form}>
          
          {/* الخانة الأولى والثانية: الاسم واللقب */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الاسم</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="الاسم"
                placeholderTextColor="#ADB5BD"
                value={firstName}
                onChangeText={setFirstName}
                textAlign="right"
              />
              <User color={THEME_NAVY} size={20} style={styles.fieldIcon} />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اللقب</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="اللقب"
                placeholderTextColor="#ADB5BD"
                value={lastName}
                onChangeText={setLastName}
                textAlign="right"
              />
              <User color={THEME_NAVY} size={20} style={styles.fieldIcon} />
            </View>
          </View>

          {/* الخانة الثانية: رقم الهاتف (أرقام فقط) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>رقم الهاتف</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.prefix}>+213</Text>
              <TextInput
                style={styles.input}
                placeholder="550 00 00 00"
                placeholderTextColor="#ADB5BD"
                keyboardType="numeric"
                value={phone}
                onChangeText={setPhone}
                textAlign="left" // رقم الهاتف يفضل أن يكون لليسار
              />
              <Phone color={THEME_NAVY} size={20} style={styles.fieldIcon} />
            </View>
          </View>

          {/* الخانة الثالثة: الولايات في الجزائر (قائمة منسدلة) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الولاية</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedProvince}
                onValueChange={(itemValue) => setSelectedProvince(itemValue)}
                style={styles.picker}
                dropdownIconColor={THEME_NAVY}
              >
                {algerianProvinces.map((province, index) => (
                  <Picker.Item key={index} label={province} value={province} />
                ))}
              </Picker>
              <View style={styles.pickerIconOverlay}>
                 <MapPin color={THEME_NAVY} size={20} />
              </View>
            </View>
          </View>

        </View>

        {/* زر الحفظ */}
        <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={handleSave}>
          <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    backgroundColor: THEME_NAVY,
    paddingBottom: 20,
    // paddingTop is set dynamically via inline style using insets.top
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
  },
  backButton: {
    padding: 5,
  },
  scrollContent: {
    padding: 25,
    alignItems: 'center',
  },
  photoContainer: {
    marginBottom: 40,
    marginTop: 10,
  },
  avatarWrapper: {
    position: 'relative',
    borderWidth: 3,
    borderColor: THEME_YELLOW,
    borderRadius: 65,
    padding: 3,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: THEME_NAVY,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    textAlign: 'left',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFF',
    borderRadius: 15,
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: '#F2F2F7',
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    }),
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingHorizontal: 10,
    fontFamily: 'Cairo-Bold',
  },
  prefix: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: 'Cairo-Bold',
    marginRight: 5,
  },
  fieldIcon: {
    marginLeft: 10,
  },
  pickerWrapper: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    height: 60,
    borderWidth: 1.5,
    borderColor: '#F2F2F7',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 2 },
    }),
  },
  picker: {
    width: '100%',
    height: '100%',
    color: '#000',
  },
  pickerIconOverlay: {
    position: 'absolute',
    right: 15,
    pointerEvents: 'none',
  },
  saveButton: {
    backgroundColor: THEME_YELLOW,
    width: '100%',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
    elevation: 6,
    shadowColor: THEME_YELLOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  saveButtonText: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
  },
});

export default EditProfileAlgerian;
