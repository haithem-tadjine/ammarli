import ScreenContainer from '../../../components/ScreenContainer';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomerStore } from '../../../src/store/useCustomerStore';

const THEME_NAVY = '#002147';
const THEME_YELLOW = '#FFCC00';

export default function PromotionsScreen() {
  const insets = useSafeAreaInsets();
  const [promoCode, setPromoCode] = useState('');

  const { promos, fetchPromos } = useCustomerStore();

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      if (Platform.OS === 'web') {
        window.alert('يرجى إدخال رمز ترويجي أولاً');
      } else {
        Alert.alert('تنبيه', 'يرجى إدخال رمز ترويجي أولاً');
      }
      return;
    }
    if (Platform.OS === 'web') {
      window.alert(`تم تطبيق الرمز: ${promoCode}`);
    } else {
      Alert.alert('تم', `تم تطبيق الرمز: ${promoCode}`);
    }
  };

  const handleUseOffer = (title: string) => {
    if (Platform.OS === 'web') {
      window.alert(`هل تود استخدام عرض: ${title}؟`);
    } else {
      Alert.alert('استخدام العرض', `هل تود استخدام عرض: ${title}؟`);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar hidden={false} barStyle="dark-content" />
      
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView 
          behavior="padding" 
          style={{ flex: 1 }}
         keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
          <ScrollView 
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 80 + insets.bottom }]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            
            <Text style={styles.headerTitle}>العروض والخصومات</Text>

          {/* Promo Code Input Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>إضافة رمز ترويجي</Text>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.applyButton} onPress={handleApplyPromo}>
                <Text style={styles.applyButtonText}>تطبيق</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="أدخل الرمز هنا..."
                placeholderTextColor="#8E8E93"
                value={promoCode}
                onChangeText={setPromoCode}
                textAlign="right"
              />
            </View>
          </View>

          {/* Offers List Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>العروض المتاحة</Text>
            {promos.map((offer, index) => (
              <View key={offer.id || index} style={styles.offerCard}>
                <TouchableOpacity style={styles.useButton} onPress={() => handleUseOffer(offer.title)}>
                  <Text style={styles.useButtonText}>استخدام</Text>
                </TouchableOpacity>
                
                <View style={styles.offerInfo}>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <Text style={styles.offerSubtitle}>{offer.description || offer.subtitle}</Text>
                </View>

                <View style={styles.iconContainer}>
                  <Feather name={offer.icon || 'gift'} color={THEME_YELLOW} size={28} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    color: '#000',
    textAlign: 'left',
    marginBottom: 35,
  },
  section: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#000',
    textAlign: 'left',
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFF',
    borderRadius: 15,
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: '#000',
    paddingRight: 10,
  },
  applyButton: {
    backgroundColor: THEME_NAVY,
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 10,
  },
  applyButtonText: {
    color: '#FFF',
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
  },
  offerCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  iconContainer: {
    width: 55,
    height: 55,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  offerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 15,
  },
  offerTitle: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    textAlign: 'left',
    marginBottom: 4,
  },
  offerSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#8E8E93',
    textAlign: 'left',
  },
  useButton: {
    backgroundColor: THEME_NAVY,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  useButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'Cairo-Bold',
  },
});
