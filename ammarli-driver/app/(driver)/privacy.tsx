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
import { ChevronRight, ShieldCheck, MapPin, Database, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const THEME_NAVY = '#012047';
const THEME_YELLOW = '#FFCC00';

// تفعيل اتجاه اليمين لليسار
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const DriverPrivacyPolicyScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sections = [
    {
      id: 1,
      icon: <MapPin color={THEME_NAVY} size={24} />,
      title: 'تتبع الموقع الجغرافي',
      content: 'نحن نستخدم بيانات موقعك في الخلفية وأثناء استخدام التطبيق لمطابقتك مع الطلبات القريبة ولتزويد العملاء بوقت وصول دقيق (ETA). جمع هذه البيانات أساسي لضمان تجربة توصيل سلسة وآمنة.'
    },
    {
      id: 2,
      icon: <Database color={THEME_NAVY} size={24} />,
      title: 'البيانات الشخصية والمركبة',
      content: 'نقوم بجمع بياناتك الأساسية (الاسم، الهاتف، الصورة الشخصية) وبيانات مركبتك (رقم اللوحة، نوع المياه، سعة الخزان) لضمان موثوقية الخدمة والالتزام بالمعايير القانونية.'
    },
    {
      id: 3,
      icon: <ShieldCheck color={THEME_NAVY} size={24} />,
      title: 'حماية وأمان البيانات',
      content: 'يتم تشفير وتخزين كافة بياناتك المهنية والمادية بشكل آمن. نحن لا نبيع بياناتك الشخصية أبداً، ونشارك فقط الحد الأدنى المطلوب مع الزبون لإتمام عملية التوصيل بنجاح.'
    },
    {
      id: 4,
      icon: <Bell color={THEME_NAVY} size={24} />,
      title: 'الاستخدام والاتصالات',
      content: 'نستخدم معلوماتك لإرسال التنبيهات بخصوص الطلبات الجديدة، الدفعات المالية، وتحديثات التطبيق. كما نستخدمها لحل النزاعات وتحسين جودة الخدمة بشكل مستمر.'
    }
  ];

  return (
    <ScreenContainer style={styles.container}>
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
        <View style={styles.introContainer}>
          <ShieldCheck color={THEME_NAVY} size={48} style={{ marginBottom: 15 }} />
          <Text style={styles.introTitle}>شفافية وأمان</Text>
          <Text style={styles.introText}>
            في عمارلي، خصوصية شركائنا السائقين هي أولويتنا. صممت سياستنا لتكون شفافة ولتعلمك بالضبط كيف نجمع بياناتك ونحميها ونستخدمها لزيادة أرباحك وتسهيل عملك.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.id} style={styles.policyCard}>
            <View style={styles.yellowAccent} />
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                {section.icon}
              </View>
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            <Text style={styles.cardContent}>{section.content}</Text>
          </View>
        ))}

        <Text style={styles.updateText}>
          آخر تحديث: أوت 2026
        </Text>

        {/* زر الموافقة السفلي */}
        <TouchableOpacity style={styles.confirmButton} activeOpacity={0.8} onPress={() => router.back()}>
          <Text style={styles.confirmButtonText}>موافق ومتابعة</Text>
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
    paddingBottom: 40,
  },
  introContainer: {
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  introTitle: {
    fontSize: 24,
    fontFamily: 'Cairo-Black',
    color: THEME_NAVY,
    marginBottom: 10,
  },
  introText: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 204, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12, // Since RTL is true, marginLeft pushes text away
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    flex: 1,
  },
  cardContent: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'left',
    lineHeight: 26,
    fontFamily: 'Cairo-Medium',
  },
  updateText: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: 'Cairo-Medium',
    marginTop: 10,
    marginBottom: 25,
  },
  confirmButton: {
    backgroundColor: THEME_YELLOW,
    width: '100%',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  confirmButtonText: {
    color: THEME_NAVY,
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
  },
});

export default DriverPrivacyPolicyScreen;
