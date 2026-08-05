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
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useDriverStore } from '../../src/store/useDriverStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const COLORS = {
  primary:       '#002147',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  textSecondary: '#64748B',
  success:       '#22C55E',
};

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

  const params = useLocalSearchParams<{ orderId: string; customerName: string; price: string; avatarUrl: string }>();
  const orderId = params.orderId;
  const customerName = params.customerName ?? 'الزبون';

  // Customer Rating State
  const [customerRating, setCustomerRating] = useState(5);
  const [selectedChips,  setSelectedChips]  = useState<string[]>([]);
  const [customerComment, setCustomerComment] = useState('');
  
  // App Rating State
  const [appRating, setAppRating] = useState(0); // 0 means unrated
  const [appComment, setAppComment] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isOnline = useDriverStore((s: any) => s.isOnline);

  const toggleChip = (chip: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const handleCustomerStarPress = (star: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomerRating(star);
    setSelectedChips([]);
  };

  const handleAppStarPress = (star: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAppRating(star);
  };

  const finishProcess = () => {
    // Check if there are other active orders
    const activeDriverOrders = useDriverStore.getState().activeDriverOrders;
    if (activeDriverOrders.length > 0) {
      const nextOrder = activeDriverOrders[0];
      router.replace({
        pathname: '/(driver)/order-details',
        params: { 
          orderId: nextOrder.orderId, 
          customerName: nextOrder.customer?.name || '', 
          address: nextOrder.deliveryAddress?.label || '' 
        }
      } as any);
    } else {
      router.replace('/(driver)/(tabs)' as any);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const customerId = 'unknown'; 
      if (orderId) {
        await import('../../src/services/api').then(({ api }) => {
          // Submit customer rating
          const req1 = api.post(`/requests/${orderId}/rate`, {
            targetId: customerId,
            rating: customerRating,
            comment: `${selectedChips.join(', ')} - ${customerComment}`,
          });

          // Submit app rating if provided
          let req2: Promise<any> = Promise.resolve();
          if (appRating > 0) {
            req2 = api.post(`/app-rating`, {
              rating: appRating,
              comment: appComment,
              userRole: 'driver',
              orderId: orderId,
            }).catch(e => console.warn('App rating submission not implemented on backend', e));
          }

          return Promise.all([req1, req2]);
        });
      }
      setSubmitted(true);
    } catch (e) {
      console.warn('Failed to submit rating', e);
    } finally {
      setIsLoading(false);
      setTimeout(finishProcess, 1500);
    }
  };

  const handleSkip = () => {
    finishProcess();
  };

  // ── النجوم ─────────────────────────────────────────────────────────────────
  const renderStars = (currentRating: number, onPress: (star: number) => void) =>
    [1, 2, 3, 4, 5].map(i => (
      <TouchableOpacity key={i} onPress={() => onPress(i)} activeOpacity={0.7}>
        <Ionicons
          name={i <= currentRating ? 'star' : 'star-outline'}
          size={38}
          color={i <= currentRating ? COLORS.secondary : 'rgba(255,255,255,0.4)'}
          style={{ marginHorizontal: 4 }}
        />
      </TouchableOpacity>
    ));

  const bgColors = isOnline ? (['#F8FAFC', '#E2E8F0'] as const) : (['#F1F5F9', '#CBD5E1'] as const);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── 1. بطاقة تقييم الزبون (Glass Card) ── */}
          <BlurView intensity={70} tint="light" style={styles.card}>
            <View style={styles.customerHeader}>
              <View style={styles.avatarWrapper}>
                {params.avatarUrl ? (
                  <Image source={{ uri: params.avatarUrl as string }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: 'rgba(0,33,71,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={28} color={COLORS.primary} />
                  </View>
                )}
              </View>
              <Text style={styles.customerName}>{customerName}</Text>
              
              <View style={styles.orderBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.success} />
                <Text style={styles.orderBadgeText}>تم التوصيل بنجاح • {params.price ? `${Number(params.price).toLocaleString('ar-DZ')} د.ج` : ''}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.questionText}>كيف كانت تجربتك مع هذا الزبون؟</Text>
            
            <View style={styles.starsSection}>
              <View style={styles.starsRow}>{renderStars(customerRating, handleCustomerStarPress)}</View>
              <Text style={styles.ratingLabel}>{RATING_LABELS[customerRating]}</Text>
            </View>

            <View style={styles.chipsContainer}>
              {CHIPS_BY_RATING[customerRating].map((chip, idx) => {
                const isSelected = selectedChips.includes(chip);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => toggleChip(chip)}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={COLORS.white} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="تعليق إضافي للزبون (اختياري)..."
              placeholderTextColor="rgba(0,33,71,0.4)"
              multiline
              numberOfLines={3}
              value={customerComment}
              onChangeText={setCustomerComment}
              textAlign="right"
              textAlignVertical="top"
            />
          </BlurView>


          {/* ── 2. بطاقة تقييم التطبيق (Glass Card) ── */}
          <BlurView intensity={70} tint="light" style={styles.card}>
            <View style={styles.appRatingHeaderRow}>
              <View style={styles.appIconBox}>
                <MaterialCommunityIcons name="cellphone-check" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>رأيك في تطبيق عَمّرلي</Text>
            </View>
            
            <Text style={styles.questionText}>كيف تقيم تجربتك مع التطبيق اليوم؟</Text>

            <View style={styles.starsSection}>
              <View style={styles.starsRow}>{renderStars(appRating, handleAppStarPress)}</View>
              <Text style={styles.ratingLabel}>{appRating > 0 ? RATING_LABELS[appRating] : 'اضغط للتقييم'}</Text>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="هل لديك مقترحات أو واجهت أي مشاكل؟"
              placeholderTextColor="rgba(0,33,71,0.4)"
              multiline
              numberOfLines={3}
              value={appComment}
              onChangeText={setAppComment}
              textAlign="right"
              textAlignVertical="top"
            />
          </BlurView>

          {/* ── رسالة النجاح ── */}
          {submitted && (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
              <Text style={styles.successText}>شكراً! تم إرسال تقييمك.</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── الأزرار العائمة ── */}
      <BlurView intensity={90} tint="light" style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.submitBtn, (submitted || isLoading) && { opacity: 0.7 }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitted || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>إرسال التقييمات</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>تخطي</Text>
        </TouchableOpacity>
      </BlurView>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },

  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
  },
  
  customerHeader: { alignItems: 'center', marginBottom: 15 },
  avatarWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2, borderColor: COLORS.white,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
  },
  avatar: { width: 76, height: 76, borderRadius: 38 },
  customerName: { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary },
  
  orderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    marginTop: 8,
  },
  orderBadgeText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: COLORS.success },
  
  divider: { height: 1, backgroundColor: 'rgba(0,33,71,0.08)', marginVertical: 15 },

  appRatingHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15, justifyContent: 'center' },
  appIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,33,71,0.05)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },

  questionText: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.primary, textAlign: 'center', marginBottom: 15 },

  starsSection: { alignItems: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  ratingLabel: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.secondary },

  chipsContainer: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 8, marginBottom: 20,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  chipTextSelected: { color: COLORS.white },

  textInput: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16, padding: 15,
    fontSize: 14, fontFamily: 'Cairo-SemiBold', color: COLORS.primary,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    minHeight: 80,
  },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(34,197,94,0.1)', paddingVertical: 12, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    marginBottom: 20,
  },
  successText: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.success },

  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 15,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    gap: 12,
  },
  submitBtn: {
    height: 60, backgroundColor: COLORS.secondary, borderRadius: 20,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: COLORS.secondary, shadowOpacity: 0.3, shadowRadius: 10,
  },
  submitText: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
  skipBtn: { height: 40, justifyContent: 'center', alignItems: 'center' },
  skipText: { fontSize: 15, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary, textDecorationLine: 'underline' },
});
