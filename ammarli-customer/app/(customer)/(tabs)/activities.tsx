import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Linking,
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Phone, Star, Truck, X } from 'lucide-react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { useCustomerStore, ScheduledOrder, DriverInfo } from '../../../src/store/useCustomerStore';
import { SkeletonList } from '../../../components/SkeletonLoader';
import Svg, { Circle, Path, Line, Rect } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ScreenContainer, { TAB_BAR_HEIGHT, MIN_BOTTOM_INSET } from '../../../components/ScreenContainer';

const { width, height } = Dimensions.get('window');
const NAVY = '#012047';
const YELLOW = '#F3CD0D';
const BG = '#F8FAFC';
const WHITE = '#FFFFFF';

interface ScheduledOrderCardProps {
  status?: 'pending' | 'accepted';
  orderData: ScheduledOrder;
  onCardPress: () => void;
}

const ScheduledOrderCard = React.memo(({ status = 'pending', orderData, onCardPress }: ScheduledOrderCardProps) => {
  const isAccepted = status === 'accepted';

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onCardPress} 
      style={[styles.card, isAccepted && styles.cardAccepted]}
    >
      {/* Header: Title and Status */}
      <View style={styles.cardHeader}>
        {/* Right side in RTL (1st JSX element) */}
        <View style={styles.cardHeaderRight}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons 
              name={orderData.iconName || 'water-outline'} 
              size={24} 
              color={NAVY}
            />
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{orderData.title}</Text>
        </View>

        {/* Left side in RTL (2nd JSX element) */}
        <View style={[styles.statusBadge, isAccepted ? styles.badgeSuccess : styles.badgeWarning]}>
          <Text style={[styles.statusText, isAccepted ? styles.textSuccess : styles.textWarning]}>
            {isAccepted ? 'موعد مؤكد' : 'جاري البحث'}
          </Text>
          {!isAccepted && <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 4 }} />}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Schedule Info */}
      <View style={styles.scheduleRow}>
        <Ionicons name="calendar-outline" size={18} color="#64748B" />
        <Text style={styles.scheduleText}>{orderData.schedule}</Text>
      </View>

      {/* Driver Info (If Accepted) */}
      {isAccepted && orderData.driver && (
        <View style={styles.driverBox}>
          <Image source={{ uri: orderData.driver.image }} style={styles.driverImg} />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{orderData.driver.name}</Text>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={12} color={YELLOW} />
              <Text style={styles.ratingText}>{orderData.driver.rating}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.callBtn} 
            onPress={() => handleCall(orderData.driver?.phone)}
          >
            <Ionicons name="call" size={18} color={WHITE} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
});
ScheduledOrderCard.displayName = 'ScheduledOrderCard';

// Empty State Component
const EmptyActivities = React.memo(({ onPress, title, subtitle }: { onPress: () => void, title?: string, subtitle?: string }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconCircle}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={50} color="#CBD5E1" />
    </View>
    <Text style={styles.emptyTitle}>{title || 'لا توجد طلبات مجدولة'}</Text>
    <Text style={styles.emptySubtitle}>{subtitle || 'اطلب مياهك الآن لكي تظهر هنا فور جدولتها.'}</Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.emptyBtnText}>اطلب مياهك الآن</Text>
    </TouchableOpacity>
  </View>
));
EmptyActivities.displayName = 'EmptyActivities';

export default function MyActivitiesScreen() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<ScheduledOrder | null>(null);

  const fetchPastOrders = useCustomerStore((s) => s.fetchPastOrders);
  const fetchScheduledOrders = useCustomerStore((s) => s.fetchScheduledOrders);
  const scheduledOrders = useCustomerStore((s) => s.scheduledOrders);
  const pastOrders = useCustomerStore((s) => s.pastOrders);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadData = async () => {
        if (scheduledOrders.length === 0 && pastOrders.length === 0) {
          setIsLoading(true);
        }
        await Promise.all([fetchPastOrders(), fetchScheduledOrders()]);
        if (isActive) setIsLoading(false);
      };
      loadData();
      return () => { isActive = false; };
    }, [fetchPastOrders, fetchScheduledOrders, scheduledOrders.length, pastOrders.length])
  );

  const pastOrdersList = pastOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

  const openOrderDetails = (order: ScheduledOrder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOrderDetails(order);
    setBottomSheetVisible(true);
  };



  const handleRate = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(customer)/driver-rating');
  };

  return (
    <ScreenContainer edges={['top']} backgroundColor={BG} statusBarStyle="dark-content" statusBarColor={BG}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>نشاطاتي</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]} 
          onPress={() => { Haptics.selectionAsync(); setActiveTab('upcoming'); }}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>الطلبات المجدولة</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'past' && styles.tabBtnActive]} 
          onPress={() => { Haptics.selectionAsync(); setActiveTab('past'); }}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>الطلبات السابقة</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 20 }]}>
          <SkeletonList type="card" count={3} />
        </ScrollView>
      ) : (
        <FlatList
          data={activeTab === 'upcoming' ? scheduledOrders : pastOrdersList}
          keyExtractor={(item: any) => item.id ? item.id.toString() : Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, MIN_BOTTOM_INSET) + 20 }]}
          ListEmptyComponent={
            <EmptyActivities 
              onPress={() => router.replace('/(customer)/(tabs)')} 
              title={activeTab === 'past' ? "لا توجد طلبات سابقة" : undefined}
              subtitle={activeTab === 'past' ? "اطلب مياهك الآن لكي يظهر سجلك هنا" : undefined}
            />
          }
          renderItem={({ item }: { item: any }) => {
            if (activeTab === 'upcoming') {
              return (
                <ScheduledOrderCard
                  status={item.status}
                  orderData={item}
                  onCardPress={() => openOrderDetails(item)}
                />
              );
            } else {
              const isCancelled = item.status === 'cancelled';
              const waterTypeAr: Record<string, string> = {
                spring:   'ينابيع',
                well:     'آبار',
                ashghal:  'أشغال',
                tanker:   'صهريج',
                bottled:  'معبأة',
              };
              const waterLabel = item.waterType
                ? (waterTypeAr[(item.waterType as string).toLowerCase()] || item.waterType)
                : null;
              const orderSummaryText = waterLabel
                ? `مياه ${waterLabel}`
                : (item.items && item.items.length > 0 ? `${item.items.length} منتجات` : 'طلب مياه');
              
              return (
                <View style={styles.pastCard}>
                  <View style={styles.pastCardTop}>
                    <View style={styles.pastCardInfo}>
                      <Text style={[styles.pastCardTitle, isCancelled && { color: '#EF4444' }]} numberOfLines={2}>
                        {isCancelled ? 'طلب ملغى' : orderSummaryText}
                      </Text>
                      <Text style={styles.pastCardTime}>{item.orderTime || item.time || '10:00 ص'}</Text>
                      <Text style={[styles.pastCardPrice, isCancelled && { color: '#EF4444', fontSize: 14 }]}>
                        {isCancelled ? `السبب: ${item.cancelReason || 'غير محدد'}` : (item.price ? `${item.price} د.ج` : 'السعر غير محدد')}
                      </Text>
                    </View>
                    <View style={[styles.pastIconBox, isCancelled && styles.pastIconBoxCancelled]}>
                      {isCancelled ? (
                        <Ionicons name="close" size={24} color="#EF4444" />
                      ) : (
                        <MaterialCommunityIcons name="check-decagram" size={28} color={NAVY} />
                      )}
                    </View>
                  </View>

                  {!isCancelled && (
                    <View style={styles.pastCardActions}>
                      <TouchableOpacity style={styles.rateBtn} onPress={() => handleRate(item)}>
                        <Text style={styles.rateBtnText}>تقييم</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }
          }}
        />
      )}

      {/* Bottom Sheet */}
      <Modal visible={isBottomSheetVisible} transparent animationType="slide" onRequestClose={() => setBottomSheetVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setBottomSheetVisible(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            
            <View style={styles.bsHeader}>
              <Text style={styles.bsTitle}>تفاصيل الموعد</Text>
              <TouchableOpacity onPress={() => setBottomSheetVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {selectedOrderDetails && (
              <View style={styles.bsContent}>
                <View style={styles.bsRow}>
                  <Text style={styles.bsLabel}>الخدمة:</Text>
                  <Text style={styles.bsValue}>{selectedOrderDetails.title}</Text>
                </View>
                <View style={styles.bsRow}>
                  <Text style={styles.bsLabel}>التاريخ والوقت:</Text>
                  <Text style={styles.bsValue}>{selectedOrderDetails.schedule}</Text>
                </View>
                <View style={styles.bsRow}>
                  <Text style={styles.bsLabel}>الحالة:</Text>
                  <View style={[styles.statusBadge, selectedOrderDetails.status === 'accepted' ? styles.badgeSuccess : styles.badgeWarning]}>
                    <Text style={[styles.statusText, selectedOrderDetails.status === 'accepted' ? styles.textSuccess : styles.textWarning]}>
                      {selectedOrderDetails.status === 'accepted' ? 'موعد مؤكد' : 'جاري البحث'}
                    </Text>
                  </View>
                </View>

                {selectedOrderDetails.driver && (
                  <View style={styles.bsDriverBox}>
                    <Image source={{ uri: selectedOrderDetails.driver.image }} style={styles.bsDriverImg} />
                    <Text style={styles.bsDriverName}>{selectedOrderDetails.driver.name}</Text>
                    <Text style={styles.bsDriverRole}>سائق توصيل</Text>
                    
                    <TouchableOpacity style={styles.bsCallBtn} onPress={() => Linking.openURL(`tel:${selectedOrderDetails.driver?.phone}`)}>
                      <Text style={styles.bsCallBtnText}>اتصال بالسائق</Text>
                      <Ionicons name="call" size={20} color={NAVY} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  pageTitle: { fontSize: 26, fontFamily: 'Cairo-Bold', color: NAVY, textAlign: 'right' },
  
  // Tabs (Using flexDirection: 'row' so 1st item is Right in RTL)
  tabsWrapper: { flexDirection: 'row', backgroundColor: '#E2E8F0', marginHorizontal: 20, borderRadius: 16, padding: 4, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: WHITE, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 15, fontFamily: 'Cairo-SemiBold', color: '#64748B' },
  tabTextActive: { color: NAVY, fontFamily: 'Cairo-Bold' },

  scrollContent: { paddingHorizontal: 20 },

  // Upcoming Cards
  card: {
    backgroundColor: WHITE, borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: 'transparent',
  },
  cardAccepted: { borderColor: YELLOW },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  cardTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY, flex: 1, textAlign: 'right' },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeSuccess: { backgroundColor: '#D1FAE5' },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 12, fontFamily: 'Cairo-Bold' },
  textSuccess: { color: '#059669', fontSize: 12, fontFamily: 'Cairo-Bold' },
  textWarning: { color: '#D97706', fontSize: 12, fontFamily: 'Cairo-Bold' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 12, gap: 8 },
  scheduleText: { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: '#475569' },

  driverBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, marginTop: 4 },
  driverImg: { width: 40, height: 40, borderRadius: 20, marginLeft: 12 },
  driverInfo: { flex: 1, alignItems: 'flex-start' },
  driverName: { fontSize: 15, fontFamily: 'Cairo-Bold', color: NAVY },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontFamily: 'Cairo-Bold', color: '#64748B' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginRight: 'auto' },

  // Past Cards
  pastCard: {
    backgroundColor: WHITE, borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  pastCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pastCardInfo: { flex: 1, alignItems: 'flex-start' },
  pastCardTitle: { fontSize: 15, fontFamily: 'Cairo-Bold', color: NAVY, textAlign: 'right', marginBottom: 4 },
  pastCardTime: { fontSize: 13, fontFamily: 'Cairo-SemiBold', color: '#94A3B8', marginBottom: 8 },
  pastCardPrice: { fontSize: 18, fontFamily: 'Cairo-Bold', color: NAVY },
  
  pastIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  pastIconBoxCancelled: { backgroundColor: '#FEF2F2' },
  
  pastCardActions: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12 },
  reorderBtn: { backgroundColor: YELLOW, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  reorderBtnText: { color: NAVY, fontFamily: 'Cairo-Bold', fontSize: 14 },
  rateBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  rateBtnText: { color: NAVY, fontFamily: 'Cairo-Bold', fontSize: 14 },

  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: WHITE, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  emptyTitle: { fontSize: 20, fontFamily: 'Cairo-Bold', color: NAVY, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  emptyBtn: { backgroundColor: NAVY, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 20 },
  emptyBtnText: { color: WHITE, fontFamily: 'Cairo-Bold', fontSize: 16 },

  // Bottom Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,33,71,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: WHITE, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24 },
  bsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  bsTitle: { fontSize: 20, fontFamily: 'Cairo-Bold', color: NAVY },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  
  bsContent: {},
  bsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  bsLabel: { fontSize: 15, fontFamily: 'Cairo-SemiBold', color: '#64748B' },
  bsValue: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY, flex: 1, textAlign: 'left', marginLeft: 20 },

  bsDriverBox: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginTop: 25 },
  bsDriverImg: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  bsDriverName: { fontSize: 18, fontFamily: 'Cairo-Bold', color: NAVY },
  bsDriverRole: { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: '#64748B', marginBottom: 20 },
  bsCallBtn: { flexDirection: 'row', backgroundColor: YELLOW, paddingHorizontal: 25, paddingVertical: 14, borderRadius: 20, alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center' },
  bsCallBtnText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: NAVY }
});
