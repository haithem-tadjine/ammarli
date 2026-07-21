import ScreenContainer from '../../../components/ScreenContainer';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomerStore } from '../../../src/store/useCustomerStore';

const THEME_NAVY = '#002147';
const THEME_YELLOW = '#FFCC00';

export default function PromotionsScreen() {
  const insets = useSafeAreaInsets();
  const [promoCode, setPromoCode] = useState('');

  const promos = useCustomerStore(state => state.promos);
  const fetchPromos = useCustomerStore(state => state.fetchPromos);
  const isLoadingPromos = useCustomerStore(state => state.isLoadingPromos);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال رمز ترويجي أولاً');
      return;
    }
    console.warn('TODO: Connect promo apply to backend');
    Alert.alert('قريباً', 'ميزة الرموز الترويجية قيد التطوير');
  };

  const handleUseOffer = (title: string) => {
    console.warn(`TODO: Connect use offer (${title}) to backend`);
    Alert.alert('قريباً', 'استخدام العروض قيد التطوير');
  };

  const renderHeader = () => (
    <>
      <Text style={styles.headerTitle}>العروض والخصومات</Text>

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
      <Text style={styles.sectionLabel}>العروض المتاحة</Text>
    </>
  );

  const renderEmpty = () => {
    if (isLoadingPromos) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={THEME_NAVY} />
          <Text style={styles.emptyText}>جاري تحميل العروض...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Feather name="inbox" size={48} color="#8E8E93" />
        <Text style={styles.emptyText}>لا توجد عروض حالياً، ترقبوا جديدنا!</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.offerCard}>
      <TouchableOpacity style={styles.useButton} onPress={() => handleUseOffer(item.title)}>
        <Text style={styles.useButtonText}>استخدام</Text>
      </TouchableOpacity>
      <View style={styles.offerInfo}>
        <Text style={styles.offerTitle}>{item.title}</Text>
        <Text style={styles.offerSubtitle}>{item.description || item.subtitle}</Text>
      </View>
      <View style={styles.iconContainer}>
        <Feather name={item.icon || 'gift'} color={THEME_YELLOW} size={28} />
      </View>
    </View>
  );

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar hidden={false} barStyle="dark-content" />
      
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView 
          behavior="padding" 
          style={{ flex: 1 }}
         keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
          <FlatList
            data={promos}
            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 80 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    marginTop: 15,
    fontFamily: 'Cairo-SemiBold',
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
