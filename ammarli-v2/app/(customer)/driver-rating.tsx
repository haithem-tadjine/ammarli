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
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Animated
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCustomerStore } from '../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#012047',
  secondary: '#F3CD0D',
  white: '#FFFFFF',
  background: '#F4F7FA',
  textSecondary: '#64748B',
  surface: '#FFFFFF',
  border: '#E2E8F0',
};

export default function DriverRatingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeOrder = useCustomerStore(state => state.activeOrder);
  const driverName = activeOrder?.driverInfo?.name || "السائق";
  const driverImage = activeOrder?.driverInfo?.avatarUrl || null;

  const [driverRating, setDriverRating] = useState(5);
  const [appRating, setAppRating] = useState(0);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const getChipsForRating = (currentRating: number) => {
    switch(currentRating) {
      case 5: return ['ممتاز!', 'سريع جداً', 'ودود للغاية', 'سيارة نظيفة'];
      case 4: return ['خدمة جيدة', 'سريع', 'محترم', 'سيارة نظيفة'];
      case 3: return ['مقبول', 'تأخر قليلاً', 'تواصل متوسط'];
      case 2: return ['بطيء جداً', 'غير متعاون', 'سيارة غير نظيفة', 'تواصل سيء'];
      case 1: return ['سيء جداً', 'تأخر كثيراً', 'غير محترم', 'تجاهل التعليمات'];
      default: return [];
    }
  };

  const chips = getChipsForRating(driverRating);

  const toggleChip = (chip: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter(c => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  const handleFinish = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const activeOrder = useCustomerStore.getState().activeOrder;
      const orderId = activeOrder?.id;
      const targetId = activeOrder?.driverInfo?.id || 'unknown'; 

      if (orderId) {
        await import('../../src/services/api').then(({ api }) => {
          return api.post(`/requests/${orderId}/rate`, {
            targetId,
            rating: driverRating,
            appRating,
            comment: selectedChips.length > 0 ? `${selectedChips.join(', ')} - ${comment}` : comment,
          });
        });
      }
    } catch (e) {
      console.warn('Failed to submit rating', e);
    } finally {
      useCustomerStore.getState().clearActiveOrderStore(); 
      router.replace('/(customer)/(tabs)');
    }
  };

  const handleSkip = () => {
    useCustomerStore.getState().clearActiveOrderStore(); 
    router.replace('/(customer)/(tabs)');
  };

  const renderStars = (rating: number, setRatingFunc: (v: number) => void) => {
    let stars = [];
    for (let i = 1; i <= 5; i++) {
      const isActive = i <= rating;
      stars.push(
        <TouchableOpacity 
          key={i} 
          onPress={() => {
            Haptics.selectionAsync();
            setRatingFunc(i);
            if (setRatingFunc === setDriverRating) setSelectedChips([]); 
          }} 
          activeOpacity={0.6}
          style={styles.starBtn}
        >
          <Ionicons 
            name={isActive ? "star" : "star-outline"} 
            size={40} 
            color={isActive ? COLORS.secondary : '#CBD5E1'} 
          />
        </TouchableOpacity>
      );
    }
    return stars.reverse();
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>تقييم الخدمة</Text>
            <Text style={styles.headerSub}>رأيك يهمنا لتحسين جودة خدماتنا</Text>
          </View>

          {/* ── Driver Rating Card ─────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.driverInfoRow}>
              {driverImage ? (
                <Image source={{ uri: driverImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" color={COLORS.primary} size={28} />
                </View>
              )}
              <View style={styles.driverTextWrap}>
                <Text style={styles.driverName}>{driverName}</Text>
                <Text style={styles.driverSub}>سائق التوصيل</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.questionText}>كيف كانت تجربتك مع السائق؟</Text>
            
            <View style={styles.starsRow}>
              {renderStars(driverRating, setDriverRating)}
            </View>

            {chips.length > 0 && (
              <View style={styles.chipsContainer}>
                {chips.map((chip, index) => {
                  const isSelected = selectedChips.includes(chip);
                  return (
                    <TouchableOpacity 
                      key={index} 
                      onPress={() => toggleChip(chip)}
                      style={[styles.chip, isSelected && styles.selectedChip]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── App Rating Card ────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.appRatingHeader}>
              <View style={styles.appIconWrap}>
                <Image source={require('../../assets/images/logo.png')} style={styles.appIcon} resizeMode="contain" />
              </View>
              <View style={styles.driverTextWrap}>
                <Text style={styles.driverName}>تطبيق عمّارلي</Text>
                <Text style={styles.driverSub}>تجربة الاستخدام</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            <Text style={styles.questionText}>ما تقييمك لتجربة التطبيق؟</Text>
            
            <View style={styles.starsRow}>
              {renderStars(appRating, setAppRating)}
            </View>
          </View>

          {/* ── Comment Section ────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.questionText}>أضف تعليقاً (اختياري)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="اكتب تعليقك هنا..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              textAlign="right"
            />
          </View>

          {/* ── Actions ────────────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.submitButton} onPress={handleFinish} activeOpacity={0.8}>
            <Text style={styles.submitText}>إرسال التقييم</Text>
            <Ionicons name="checkmark-circle" color={COLORS.primary} size={24} style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>تخطي التقييم</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Cairo-Black',
    color: COLORS.primary,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  card: {
    backgroundColor: COLORS.white,
    width: '100%',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  
  driverInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  appRatingHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: COLORS.background,
  },
  avatarPlaceholder: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  appIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  appIcon: {
    width: 32, height: 32, tintColor: COLORS.white,
  },
  driverTextWrap: {
    flex: 1,
    alignItems: 'flex-start', // RTL fix by flexing start but text aligns right inherently 
    marginRight: 16,
  },
  driverName: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
  },
  driverSub: {
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
  },
  
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: '100%',
    marginVertical: 16,
  },
  
  questionText: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
    textAlign: 'right',
    marginBottom: 16,
  },
  
  starsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },

  chipsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selectedChip: {
    backgroundColor: '#FFFAED',
    borderColor: COLORS.secondary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Cairo-Bold',
  },
  selectedChipText: {
    color: COLORS.primary,
  },
  
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    height: 100,
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.primary,
    borderWidth: 1,
    borderColor: 'transparent',
    textAlignVertical: 'top',
  },
  
  submitButton: {
    backgroundColor: COLORS.secondary,
    width: '100%',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10, elevation: 5,
  },
  submitText: {
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
  },
  skipButton: {
    marginTop: 20,
    padding: 10,
  },
  skipText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: 'Cairo-Bold',
  },
});
