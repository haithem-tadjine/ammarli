import ScreenContainer from '../../../components/ScreenContainer';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const COLORS = {
  primary:       '#002147',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  background:    '#F8FAFC',
  textSecondary: '#64748B',
  border:        '#E2E8F0',
  inputBg:       '#F8FAFC',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SupportCategory = ({ label }: { label: string }) => (
  <TouchableOpacity style={styles.categoryCard} activeOpacity={0.7}>
    <Ionicons name='chevron-back' size={18} color={COLORS.primary} style={styles.arrowIconLeft} />
    <Text style={styles.categoryLabel}>{label}</Text>
  </TouchableOpacity>
);

const FAQItem = ({ title }: { title: string }) => (
  <TouchableOpacity style={styles.faqItem} activeOpacity={0.6}>
    <Ionicons name="open-outline" size={18} color={COLORS.textSecondary} />
    <Text style={styles.faqTitle}>{title}</Text>
  </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DriverHelpSupportScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleChatPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // منطق فتح الشات أو الواتساب هنا
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name='chevron-forward' size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المساعدة والدعم</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { flexGrow: 1, paddingBottom: Math.max(insets.bottom, 16) + 90 },
        ]}
      >
        {/* شريط البحث */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن مساعدة، أسئلة شائعة..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
          </View>
        </View>

        {/* الأقسام */}
        <Text style={styles.sectionTitle}>الأقسام</Text>
        <Text style={styles.sectionSubtitle}>اختر موضوعاً لمساعدتك</Text>

        <View style={styles.categoriesGrid}>
          <SupportCategory label="مشاكل الحساب"      />
          <SupportCategory label="استفسارات الدفع"   />
          <SupportCategory label="الدعم الفني"        />
          <SupportCategory label="معلومات عامة"       />
        </View>

        {/* الأسئلة الشائعة */}
        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 15 }]}>
          الأسئلة الشائعة
        </Text>

        <View style={styles.faqList}>
          <FAQItem title="كيف يمكنني إعادة تعيين كلمة المرور؟"  />
          <FAQItem title="أين يمكنني رؤية سجل الرحلات؟"          />
          <FAQItem title="كيف أحدّث بيانات مركبتي؟"              />
          <FAQItem title="كيف أرفع وثيقة جديدة؟"                />
          <FAQItem title="ما هي نسبة عمولة التطبيق؟"            />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* الفوتر الثابت */}
      <View style={[styles.footerAction, { paddingBottom: Math.max(insets.bottom, 16) + 5 }]}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatPress}
          activeOpacity={0.9}
        >
          <Ionicons name="chatbox-ellipses" size={22} color={COLORS.primary} />
          <Text style={styles.chatButtonText}>تحدث معنا</Text>
        </TouchableOpacity>
        <Text style={styles.supportAvailability}>متوفر 24/7 لأعضائنا المميزين</Text>
      </View>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Cairo-Black', color: COLORS.primary },
  backButton:  { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  // Scroll
  scrollContent: { paddingHorizontal: 24, paddingTop: 20 },

  // Search
  searchSection:   { marginBottom: 25 },
  searchContainer: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Cairo-SemiBold', color: COLORS.primary },

  // Section titles
  sectionTitle:    { fontSize: 24, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left' },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: COLORS.textSecondary,
    textAlign: 'left',
    marginTop: 4,
    marginBottom: 15,
  },

  // Categories
  categoriesGrid: { gap: 12, marginBottom: 10 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    height: 60,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  categoryLabel: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary, textAlign: 'left' },
  arrowIconLeft:  { opacity: 0.8 },

  // FAQ
  faqList: { gap: 0 },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faqTitle: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
    textAlign: 'left',
    flex: 1,
    marginLeft: 12,
  },

  // Footer
  footerAction: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatButton: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  chatButtonText:       { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
  supportAvailability:  { fontSize: 13, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary, marginTop: 8 },
});
