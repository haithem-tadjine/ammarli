import ScreenContainer from '../../../components/ScreenContainer';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, StatusBar, Alert, Platform, KeyboardAvoidingView,
  ActivityIndicator, Image
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomerStore } from '../../../src/store/useCustomerStore';
import * as Haptics from 'expo-haptics';

const NAVY = '#012047';
const YELLOW = '#F3CD0D';
const WHITE = '#FFFFFF';
const BG = '#F8FAFC';

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!promoCode.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال رمز ترويجي أولاً');
      return;
    }
    Alert.alert('قريباً', 'ميزة الرموز الترويجية قيد التطوير');
  };

  const handleUseOffer = (title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('قريباً', 'استخدام العروض قيد التطوير');
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.pageTitle}>العروض والخصومات</Text>

      {/* Promo Code Input */}
      <View style={styles.promoInputWrapper}>
        <View style={styles.inputInner}>
          {/* 1st element in row-reverse -> rendered on the RIGHT */}
          <View style={styles.inputIconWrap}>
            <MaterialCommunityIcons name="ticket-percent-outline" size={24} color="#64748B" />
          </View>
          
          {/* 2nd element -> rendered in MIDDLE */}
          <TextInput
            style={styles.input}
            placeholder="أدخل رمز الكوبون..."
            placeholderTextColor="#94A3B8"
            value={promoCode}
            onChangeText={setPromoCode}
            textAlign="right"
            autoCapitalize="characters"
          />

          {/* 3rd element in row-reverse -> rendered on the LEFT */}
          <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPromo} activeOpacity={0.8}>
            <Text style={styles.applyBtnText}>تطبيق</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>العروض المتاحة</Text>
    </View>
  );

  const renderEmpty = () => {
    if (isLoadingPromos) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.emptySubtitle}>جاري البحث عن أحدث العروض...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons name="ticket-outline" size={50} color="#CBD5E1" />
        </View>
        <Text style={styles.emptyTitle}>لا توجد عروض حالياً</Text>
        <Text style={styles.emptySubtitle}>ستظهر هنا جميع الخصومات والقسائم الترويجية الخاصة بك فور توفرها.</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.ticketCard}>
      {/* 1st element in row-reverse -> Right side: Icon/Value */}
      <View style={styles.ticketRight}>
        <View style={styles.discountBadge}>
          <MaterialCommunityIcons name={item.icon || 'star-four-points'} size={32} color={YELLOW} />
        </View>
      </View>

      {/* 2nd element -> Dashed divider */}
      <View style={styles.dashedDivider}>
        <View style={styles.notchTop} />
        <View style={styles.dashLine} />
        <View style={styles.notchBottom} />
      </View>

      {/* 3rd element in row-reverse -> Left side: Action & Details */}
      <View style={styles.ticketContent}>
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <Text style={styles.ticketDesc} numberOfLines={2}>{item.description || item.subtitle || 'استمتع بهذا العرض الحصري.'}</Text>
        
        <TouchableOpacity style={styles.useBtn} onPress={() => handleUseOffer(item.title)} activeOpacity={0.8}>
          <Text style={styles.useBtnText}>استخدام العرض</Text>
          <Ionicons name="arrow-back" size={14} color={WHITE} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar hidden={false} barStyle="dark-content" backgroundColor={BG} />
      
      <KeyboardAvoidingView 
        behavior="padding" 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}
      >
        <FlatList
          data={promos}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  
  // Header
  headerContainer: {
    marginBottom: 25,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: 'Cairo-Bold',
    color: NAVY,
    textAlign: 'right',
    marginBottom: 20,
  },
  
  // Promo Input
  promoInputWrapper: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 30,
  },
  inputInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIconWrap: {
    padding: 15,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: NAVY,
    textAlign: 'right',
    paddingHorizontal: 10,
  },
  applyBtn: {
    backgroundColor: NAVY,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  applyBtnText: {
    color: WHITE,
    fontFamily: 'Cairo-Bold',
    fontSize: 15,
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 15,
  },

  // Ticket Card
  ticketCard: {
    flexDirection: 'row-reverse',
    backgroundColor: WHITE,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    height: 130,
  },
  ticketRight: {
    width: 90,
    backgroundColor: NAVY,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  discountBadge: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  ticketContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ticketHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  ticketTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: NAVY,
    textAlign: 'right',
    flex: 1,
  },
  ticketDesc: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 18,
  },
  useBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  useBtnText: {
    color: WHITE,
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
  },

  // Dashed Divider
  dashedDivider: {
    width: 1,
    height: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  dashLine: {
    width: 1,
    height: '100%',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 1,
  },
  notchTop: {
    position: 'absolute',
    top: -10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: BG,
    zIndex: 1,
  },
  notchBottom: {
    position: 'absolute',
    bottom: -10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: BG,
    zIndex: 1,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: WHITE,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: NAVY,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 30,
  },
});
