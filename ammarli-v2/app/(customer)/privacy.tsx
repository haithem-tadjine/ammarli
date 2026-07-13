import ScreenContainer from '../../components/ScreenContainer';
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  I18nManager
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const THEME_NAVY = '#012047';
const THEME_YELLOW = '#FFCC00';

// تفعيل اتجاه اليمين لليسار
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const PrivacyPolicyScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sections = [
    {
      id: 1,
      title: 'جمع البيانات',
      content: 'نقوم بجمع المعلومات الضرورية لتقديم خدمات التوصيل، بما في ذلك الاسم، رقم الهاتف، العنوان، ومعلومات الموقع لضمان وصول المياه إليك بدقة وكفاءة في الجزائر.'
    },
    {
      id: 2,
      title: 'استخدام البيانات',
      content: 'تُستخدم بياناتك حصرياً لتحسين تجربة التوصيل، إدارة الطلبات، وتقديم عروض مخصصة. نحن نلتزم بعدم مشاركة معلوماتك مع أطراف ثالثة بموافقتك، باستثناء ما يقتضيه القانون.'
    },
    {
      id: 3,
      title: 'حماية البيانات',
      content: 'نتخذ أقصى درجات الأمان لحماية معلوماتك الشخصية من الوصول غير المصرح به، باستخدام تقنيات تشفير متقدمة وفقاً للمعايير المعمول بها في الجزائر.'
    }
  ];

  return (
    <ScreenContainer style={styles.container}>
      {/* إخفاء شريط الحالة العلوي لمظهر نظيف */}
      <StatusBar barStyle="light-content" backgroundColor={THEME_NAVY} />

      {/* الترويسة (Header) */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ChevronRight color={THEME_YELLOW} size={32} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>سياسة الخصوصية</Text>
            <View style={{ width: 32 }} /> 
          </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.id} style={styles.policyCard}>
            <View style={styles.yellowAccent} />
            <Text style={styles.cardTitle}>{section.title}</Text>
            <Text style={styles.cardContent}>{section.content}</Text>
          </View>
        ))}

        {/* زر الموافقة السفلي */}
        <TouchableOpacity style={styles.confirmButton} activeOpacity={0.8} onPress={() => router.back()}>
          <Text style={styles.confirmButtonText}>موافق</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    backgroundColor: THEME_NAVY,
    paddingBottom: 20,
    // paddingTop is set dynamically via inline style using insets.top
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: THEME_YELLOW,
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
  },
  backButton: {
    padding: 5,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  policyCard: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  yellowAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: THEME_YELLOW,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    textAlign: 'left',
    marginBottom: 10,
  },
  cardContent: {
    fontSize: 16,
    color: '#333',
    textAlign: 'left',
    lineHeight: 26,
    fontFamily: 'Cairo-SemiBold',
  },
  confirmButton: {
    backgroundColor: THEME_YELLOW,
    width: '100%',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
    elevation: 6,
    shadowColor: THEME_YELLOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  confirmButtonText: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
  },
});

export default PrivacyPolicyScreen;
