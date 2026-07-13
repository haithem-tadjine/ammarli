import ScreenContainer from '../../components/ScreenContainer';
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useDriverStore } from '../../src/store/useDriverStore';

const { width } = Dimensions.get('window');
const PRIMARY  = '#002147';
const YELLOW   = '#F3CD0D';
const GRAY     = '#8E8E93';
const BG       = '#FAFAFA';

// ─── شرائح التقييم حسب عدد النجوم ───────────────────────────────────────────
const CHIPS_BY_RATING: Record<number, string[]> = {
  5: ['دفع بسرعة', 'متعاون جداً', 'تواصل ممتاز', 'واضح في الطلب', 'ينصح به'],
  4: ['محترم', 'تواصل جيد', 'دفع في الوقت', 'طلب واضح'],
  3: ['مقبول', 'تأخر في الرد', 'طلب غير واضح'],
  2: ['غير متعاون', 'دفع متأخر', 'تواصل سيء'],
  1: ['سيء جداً', 'لا أنصح به', 'مشكلة في الدفع', 'تجاهل التعليمات'],
};

const RATING_LABELS: Record<number, string> = {
  5: 'ممتاز!',
  4: 'جيد جداً',
  3: 'جيد',
  2: 'سيء',
  1: 'سيء جداً',
};

export default function CustomerRatingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completeDriverOrder = useDriverStore(s => s.completeDriverOrder);

  const params = useLocalSearchParams<{ orderId: string; customerName: string; price: string; avatarUrl: string }>();
  const orderId = params.orderId;
  const customerName = params.customerName ?? 'الزبون';
  const priceValue = Number(params.price ?? 2500);

  const [rating,        setRating]        = useState(5);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [comment,       setComment]       = useState('');
  const [submitted,     setSubmitted]     = useState(false);

  const toggleChip = (chip: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const handleStarPress = (star: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating(star);
    setSelectedChips([]);
  };

  const finishProcess = () => {
    // state is already cleared in trip-completion.tsx
    router.replace('/(driver)/(tabs)' as any);
  };

  const handleSubmit = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      
      const customerId = 'unknown'; 
      if (orderId) {
        await import('../../src/services/api').then(({ api }) => {
          return api.post(`/requests/${orderId}/rate`, {
            targetId: customerId,
            rating,
            comment: `${selectedChips.join(', ')} - ${comment}`,
          });
        });
      }
    } catch (e) {
      console.warn('Failed to submit rating', e);
    } finally {
      setTimeout(finishProcess, 1500);
    }
  };

  const handleSkip = () => {
    finishProcess();
  };

  // ── النجوم ─────────────────────────────────────────────────────────────────
  const renderStars = () =>
    [1, 2, 3, 4, 5].map(i => (
      <TouchableOpacity key={i} onPress={() => handleStarPress(i)} activeOpacity={0.7}>
        <Ionicons
          name={i <= rating ? 'star' : 'star-outline'}
          size={38}
          color={i <= rating ? YELLOW : '#E5E5EA'}
          style={{ marginHorizontal: 4 }}
        />
      </TouchableOpacity>
    ));

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'center' }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={styles.cardContainer}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── بطاقة الزبون ── */}
            <View style={styles.customerCard}>
              <View style={styles.avatarWrapper}>
                {params.avatarUrl ? (
                  <Image
                    source={{ uri: params.avatarUrl as string }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={24} color="#64748B" />
                  </View>
                )}
              </View>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.questionText}>كيف كانت تجربتك مع هذا الزبون؟</Text>

              {/* شارة الطلبية */}
              <View style={styles.orderBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#22C55E" />
                <Text style={styles.orderBadgeText}>تم التوصيل بنجاح • {params.price ? `${Number(params.price).toLocaleString('ar-DZ')} د.ج` : ''}</Text>
              </View>
            </View>

            {/* ── النجوم ── */}
            <View style={styles.starsSection}>
              <View style={styles.starsRow}>{renderStars()}</View>
              <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
            </View>

            {/* ── الشرائح ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>اختر ما ينطبق</Text>
            </View>
            <View style={styles.chipsContainer}>
              {CHIPS_BY_RATING[rating].map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => toggleChip(chip)}
                  style={[styles.chip, selectedChips.includes(chip) && styles.chipSelected, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
                  activeOpacity={0.7}
                >
                  {selectedChips.includes(chip) && (
                    <Ionicons name="checkmark" size={14} color={PRIMARY} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.chipText, selectedChips.includes(chip) && styles.chipTextSelected]}>
                    {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── تعليق اختياري ── */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionTitle}>تعليق (اختياري)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="اكتب ملاحظاتك هنا..."
                placeholderTextColor="#ADB5BD"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
                textAlign="right"
                textAlignVertical="top"
              />
            </View>

            {/* ── رسالة النجاح ── */}
            {submitted && (
              <View style={styles.successBanner}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#22C55E" />
                <Text style={styles.successText}>شكراً! تم إرسال تقييمك.</Text>
              </View>
            )}

            {/* ── أزرار ── */}
            <TouchableOpacity
              style={[styles.submitBtn, submitted && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitted}
            >
              <Ionicons name="checkmark-circle" size={22} color={PRIMARY} style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>إرسال التقييم</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>تخطي</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  cardContainer: { backgroundColor: BG, borderRadius: 28, maxHeight: '85%', overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 25, alignItems: 'center' },

  // Customer card
  customerCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
  },
  avatarWrapper: {
    padding: 2, borderRadius: 34, borderWidth: 2, borderColor: YELLOW, marginBottom: 10,
  },
  avatar:       { width: 64, height: 64, borderRadius: 32 },
  customerName: { fontSize: 20, fontFamily: 'Cairo-Black', color: PRIMARY, marginBottom: 4 },
  questionText: { fontSize: 13, fontFamily: 'Cairo-SemiBold', color: GRAY },
  orderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, marginTop: 10, borderWidth: 1, borderColor: '#BBF7D0',
  },
  orderBadgeText: { fontSize: 11, fontFamily: 'Cairo-Bold', color: '#16A34A' },

  // Stars
  starsSection: { alignItems: 'center', marginBottom: 25 },
  starsRow:     { flexDirection: 'row' },
  ratingLabel:  { fontSize: 22, fontFamily: 'Cairo-Black', color: PRIMARY, marginTop: 10 },

  // Section header
  sectionHeader: { width: '100%', marginBottom: 10, alignItems: 'flex-start' },
  sectionTitle:  { fontSize: 16, fontFamily: 'Cairo-Bold', color: PRIMARY, textAlign: 'left' },

  // Chips
  chipsContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'flex-start', width: '100%', marginBottom: 20,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, margin: 4, borderWidth: 1.5, borderColor: '#E5E5EA',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
  },
  chipSelected:     { backgroundColor: YELLOW, borderColor: YELLOW },
  chipText:         { fontSize: 13, fontFamily: 'Cairo-Bold', color: GRAY },
  chipTextSelected: { color: PRIMARY },

  // Comment
  commentSection: { width: '100%', marginBottom: 25, alignItems: 'flex-start' },
  textInput: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12,
    width: '100%', height: 90, fontSize: 14, fontFamily: 'Cairo-SemiBold',
    color: PRIMARY, marginTop: 8, borderWidth: 1.5, borderColor: '#E5E5EA',
  },

  // Success
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#BBF7D0', width: '100%', marginBottom: 14,
  },
  successText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: '#16A34A' },

  // Buttons
  submitBtn: {
    backgroundColor: YELLOW, width: '100%', height: 52, borderRadius: 26,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    elevation: 3, shadowColor: YELLOW, shadowOpacity: 0.3, shadowRadius: 6,
  },
  submitText: { fontSize: 18, fontFamily: 'Cairo-Black', color: PRIMARY, marginLeft: 8 },
  skipBtn:    { marginTop: 14, padding: 10 },
  skipText:   { fontSize: 15, fontFamily: 'Cairo-SemiBold', color: GRAY },
});
