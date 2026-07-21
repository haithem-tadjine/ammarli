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
  KeyboardAvoidingView
} from 'react-native';
import { Star, Check, ChevronRight, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCustomerStore } from '../../src/store/useCustomerStore';

const { width } = Dimensions.get('window');
const THEME_NAVY = '#012047';
const THEME_YELLOW = '#FFCC00';

export default function DriverRatingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeOrder = useCustomerStore(state => state.activeOrder);
  const driverName = activeOrder?.driverInfo?.name || "السائق";
  const driverImage = activeOrder?.driverInfo?.avatarUrl || null;

  const [rating, setRating] = useState(5);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const getChipsForRating = (currentRating: number) => {
    switch(currentRating) {
      case 5: return ['ممتاز!', 'سريع جداً', 'ودود للغاية', 'أفضل سائق', 'ينصح به'];
      case 4: return ['خدمة جيدة', 'سريع', 'محترم', 'سيارة نظيفة'];
      case 3: return ['مقبول', 'تأخر قليلاً', 'تواصل متوسط'];
      case 2: return ['بطيء جداً', 'غير متعاون', 'سيارة غير نظيفة', 'تواصل سيء'];
      case 1: return ['سيء جداً', 'تأخر كثيراً', 'غير محترم', 'لا أنصح به', 'تجاهل التعليمات'];
      default: return [];
    }
  };

  const chips = getChipsForRating(rating);

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter(c => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  const getRatingText = () => {
    switch(rating) {
      case 5: return 'ممتاز!';
      case 4: return 'جيد جداً';
      case 3: return 'جيد';
      case 2: return 'سيء';
      case 1: return 'سيء جداً';
      default: return '';
    }
  };

  const handleFinish = async () => {
    try {
      const activeOrder = useCustomerStore.getState().activeOrder;
      const orderId = activeOrder?.id;
      const targetId = activeOrder?.driverInfo?.id || 'unknown'; 

      if (orderId) {
        await import('../../src/services/api').then(({ api }) => {
          return api.post(`/requests/${orderId}/rate`, {
            targetId,
            rating,
            comment: `${selectedChips.join(', ')} - ${comment}`,
          });
        });
      }
    } catch (e) {
      console.warn('Failed to submit rating', e);
    } finally {
      useCustomerStore.getState().clearActiveOrderStore(); // Safely clear active request
      router.replace('/(customer)/(tabs)');
    }
  };

  const renderStars = () => {
    let stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity 
          key={i} 
          onPress={() => {
            setRating(i);
            setSelectedChips([]); // Clear selected chips on rating change
          }} 
          activeOpacity={0.6}
        >
          <Star 
            size={48} 
            color={i <= rating ? THEME_YELLOW : "#E5E5EA"} 
            fill={i <= rating ? THEME_YELLOW : "transparent"} 
            style={{ marginHorizontal: 6 }}
          />
        </TouchableOpacity>
      );
    }
    return stars.reverse(); // For RTL display if needed, but visually stars read LTR generally. Actually we'll keep them normal LTR but align center.
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Top Driver Card */}
        <View style={styles.driverSection}>
          <View style={styles.avatarWrapper}>
            {driverImage ? (
              <Image source={{ uri: driverImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                <User color="#64748B" size={24} />
              </View>
            )}
          </View>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.questionText}>كيف كانت تجربتك مع السائق؟</Text>
        </View>

        {/* Stars Area */}
        <View style={styles.starsSection}>
          <View style={styles.starsRow}>{renderStars()}</View>
          <Text style={styles.ratingLabel}>{getRatingText()}</Text>
        </View>

        {/* Chips Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>اختر ما ينطبق</Text>
        </View>
        <View style={styles.chipsContainer}>
          {chips.map((chip, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => toggleChip(chip)}
              style={[
                styles.chip, 
                selectedChips.includes(chip) && styles.selectedChip
              ]}
            >
              <Text style={[
                styles.chipText, 
                selectedChips.includes(chip) && styles.selectedChipText
              ]}>
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comment Section */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>تعليق (اختياري)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="اكتب تعليقك هنا..."
            placeholderTextColor="#ADB5BD"
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            textAlign="right"
          />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.submitButton} onPress={handleFinish} activeOpacity={0.8}>
          <Text style={styles.submitText}>إرسال التقييم</Text>
          <Check color={THEME_NAVY} size={22} strokeWidth={3} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
          <Text style={styles.skipText}>تخطي</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    padding: 25,
    // paddingTop is set dynamically via inline style using insets.top
    alignItems: 'center',
  },
  driverSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 25,
    borderRadius: 24,
    marginBottom: 35,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarWrapper: {
    padding: 3,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: THEME_YELLOW,
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  driverName: {
    fontSize: 24,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    marginBottom: 5,
  },
  questionText: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: 'Cairo-SemiBold',
  },
  starsSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  starsRow: {
    flexDirection: 'row-reverse',
  },
  ratingLabel: {
    fontSize: 26,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    marginTop: 15,
  },
  sectionHeader: {
    width: '100%',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    textAlign: 'left',
  },
  chipsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 30,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    margin: 5,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  selectedChip: {
    backgroundColor: THEME_YELLOW,
    borderColor: THEME_YELLOW,
  },
  chipText: {
    fontSize: 15,
    color: '#8E8E93',
    fontFamily: 'Cairo-Bold',
  },
  selectedChipText: {
    color: THEME_NAVY,
  },
  commentSection: {
    width: '100%',
    marginBottom: 35,
    alignItems: 'flex-end',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    width: '100%',
    height: 120,
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: THEME_NAVY,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: THEME_YELLOW,
    width: '100%',
    height: 60,
    borderRadius: 30,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: THEME_YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitText: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    marginRight: 8,
  },
  skipButton: {
    marginTop: 20,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#ADB5BD',
    fontFamily: 'Cairo-Bold',
  },
});
