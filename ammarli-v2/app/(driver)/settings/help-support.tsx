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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useDriverStore } from '../../../src/store/useDriverStore';

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
  <TouchableOpacity style={styles.categoryWrap} activeOpacity={0.7}>
    <BlurView intensity={70} tint="light" style={styles.categoryCard}>
      <Ionicons name='chevron-back' size={18} color={COLORS.primary} style={styles.arrowIconLeft} />
      <Text style={styles.categoryLabel}>{label}</Text>
    </BlurView>
  </TouchableOpacity>
);

const FAQItem = ({ title }: { title: string }) => (
  <TouchableOpacity style={styles.faqWrap} activeOpacity={0.6}>
    <BlurView intensity={50} tint="light" style={styles.faqItem}>
      <Ionicons name="open-outline" size={18} color={COLORS.textSecondary} />
      <Text style={styles.faqTitle}>{title}</Text>
    </BlurView>
  </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DriverHelpSupportScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const isOnline = useDriverStore((s: any) => s.isOnline);
  const bgColors = isOnline ? (['#F8FAFC', '#E2E8F0'] as const) : (['#F1F5F9', '#CBD5E1'] as const);

  const handleChatPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // منطق فتح الشات أو الواتساب هنا
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <BlurView intensity={50} tint="light" style={styles.iconWrap}>
             <Ionicons name='chevron-forward' size={26} color={COLORS.primary} />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المساعدة والدعم</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { flexGrow: 1, paddingBottom: Math.max(insets.bottom, 16) + 110 },
        ]}
      >
        {/* شريط البحث */}
        <View style={styles.searchSection}>
          <BlurView intensity={60} tint="light" style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن مساعدة، أسئلة شائعة..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
          </BlurView>
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
      <BlurView intensity={80} tint="light" style={[styles.footerAction, { paddingBottom: Math.max(insets.bottom, 16) + 10, paddingTop: 16 }]}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatPress}
          activeOpacity={0.9}
        >
          <Ionicons name="chatbox-ellipses" size={24} color={COLORS.primary} />
          <Text style={styles.chatButtonText}>تحدث معنا</Text>
        </TouchableOpacity>
        <Text style={styles.supportAvailability}>متوفر 24/7 لأعضائنا المميزين</Text>
      </BlurView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: COLORS.primary },
  backButton:  { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },

  // Scroll
  scrollContent: { paddingHorizontal: 24, paddingTop: 20 },

  // Search
  searchSection:   { marginBottom: 25 },
  searchContainer: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Cairo-SemiBold', color: COLORS.primary },

  // Section titles
  sectionTitle:    { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left' },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#64748B',
    textAlign: 'left',
    marginTop: 4,
    marginBottom: 15,
  },

  // Categories
  categoriesGrid: { gap: 12, marginBottom: 10 },
  categoryWrap: { marginBottom: 4 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.5)',
    height: 64,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  categoryLabel: { fontSize: 18, fontFamily: 'Cairo-Bold', color: COLORS.primary, textAlign: 'left' },
  arrowIconLeft:  { opacity: 0.8 },

  // FAQ
  faqList: { gap: 10 },
  faqWrap: { marginBottom: 2 },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.9)',
  },
  chatButton: {
    width: '100%',
    height: 60,
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  chatButtonText:       { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
  supportAvailability:  { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#64748B', marginTop: 12 },
});
