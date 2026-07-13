import ScreenContainer from '../../components/ScreenContainer';
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  I18nManager,
  KeyboardAvoidingView
} from 'react-native';
import { 
  ChevronRight, 
  Search, 
  CreditCard, 
  Truck, 
  ShieldCheck, 
  ChevronDown, 
  ChevronLeft 
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// تفعيل الأنيميشن للأندرويد
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// تفعيل اتجاه اليمين لليسار
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const { width } = Dimensions.get('window');
const THEME_NAVY = '#012047';
const THEME_YELLOW = '#FFCC00';

const HelpSupportScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqData = [
    { 
      question: 'كيفية تتبع طلبي؟', 
      answer: 'يمكنك تتبع طلبك مباشرة من خلال صفحة "نشاطاتي" بالضغط على الطلب النشط لمشاهدة موقع السائق على الخريطة.' 
    },
    { 
      question: 'تغيير عنوان التوصيل', 
      answer: 'لتغيير العنوان، يرجى القيام بذلك قبل قبول السائق للطلب من خلال واجهة اختيار الموقع.' 
    },
    { 
      question: 'الإبلاغ عن عنصر مفقود', 
      answer: 'في حال وجود نقص في الطلب، يمكنك التواصل مع الدعم الفني فوراً من خلال زر الدردشة المباشرة.' 
    },
  ];

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const CategoryCard = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <TouchableOpacity style={styles.categoryCard} activeOpacity={0.7}>
      <ChevronLeft color={THEME_YELLOW} size={20} />
      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle}>{title}</Text>
        <View style={styles.iconWrapper}>
          <Icon color={THEME_NAVY} size={24} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_NAVY} />
      
      <View style={[styles.safeArea, { paddingTop: insets.top }, { paddingBottom: insets.bottom }]}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ChevronRight color={THEME_YELLOW} size={32} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>المساعدة والدعم</Text>
            <View style={{ width: 32 }} />
          </View>
          
          {/* شريط البحث */}
          <View style={styles.searchContainer}>
            <Search color={THEME_YELLOW} size={20} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن مساعدة..."
              placeholderTextColor="#FFCC0080" // أصفر شفاف قليلاً
              textAlign="right"
            />
          </View>
        </View>

        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
          <ScrollView contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* قسم الفئات */}
          <Text style={styles.sectionLabel}>الفئات</Text>
          <CategoryCard title="الحساب والدفع" icon={CreditCard} />
          <CategoryCard title="الطلبات والتوصيل" icon={Truck} />
          <CategoryCard title="الأمان" icon={ShieldCheck} />

          {/* قسم الأسئلة الشائعة */}
          <Text style={[styles.sectionLabel, { marginTop: 25 }]}>الأسئلة الشائعة</Text>
          <View style={styles.faqContainer}>
            {faqData.map((item, index) => (
              <View key={index} style={[styles.faqItem, index !== faqData.length - 1 && styles.faqBorder]}>
                <TouchableOpacity 
                  style={styles.faqHeader} 
                  onPress={() => toggleExpand(index)}
                  activeOpacity={0.7}
                >
                  <ChevronDown 
                    color="#FFF" 
                    size={20} 
                    style={{ transform: [{ rotate: expandedIndex === index ? '180deg' : '0deg' }] }} 
                  />
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                </TouchableOpacity>
                
                {expandedIndex === index && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB', // خلفية رمادية فاتحة جداً
  },
  safeArea: {
    flex: 1,
    backgroundColor: THEME_NAVY, // لضمان لون الـ SafeArea العلوي
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 25,
    backgroundColor: THEME_NAVY, // تم التعديل ليطابق الصورة
    borderBottomLeftRadius: 0, // الصورة لا تظهر زوايا دائرية قوية
    borderBottomRightRadius: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  headerTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: THEME_YELLOW, // تم التعديل ليطابق الصورة
    fontSize: 24,
    fontFamily: 'Cairo-Bold',
  },
  backButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFF', // تم التعديل ليطابق الصورة
    height: 55,
    borderRadius: 15,
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME_NAVY,
    paddingRight: 10,
    fontFamily: 'Cairo-SemiBold',
  },
  scrollContent: {
    padding: 20,
    backgroundColor: '#F8F9FB', // لأننا وضعنا خلفية SafeArea باللون الكحلي
  },
  sectionLabel: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    textAlign: 'left',
    marginBottom: 15,
  },
  categoryCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFF',
    borderRadius: 20,
    height: 85,
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  categoryContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    marginRight: 15,
  },
  iconWrapper: {
    width: 45,
    height: 45,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqContainer: {
    backgroundColor: THEME_NAVY,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: THEME_NAVY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  faqItem: {
    paddingHorizontal: 20,
  },
  faqBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  faqHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 22,
  },
  faqQuestion: {
    color: '#FFF',
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
  },
  faqAnswerContainer: {
    paddingBottom: 22,
    paddingTop: 0,
  },
  faqAnswer: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'left',
    fontFamily: 'Cairo-SemiBold',
  },
});

export default HelpSupportScreen;
