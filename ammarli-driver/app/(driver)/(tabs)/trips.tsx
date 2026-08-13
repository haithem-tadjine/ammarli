import React, { useState } from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useDriverStore } from '../../../src/store/useDriverStore';
import { useEffect } from 'react';

const COLORS = {
  primary:       '#003366',
  secondary:     '#F3CD0D',
  background:    '#F8FAFC',
  white:         '#FFFFFF',
  textSecondary: '#64748B',
  success:       '#22C55E',
  danger:        '#EF4444',
  border:        '#F1F5F9',
};

// ─── Types ────────────────────────────────────────────────────────────────────

/** تخصص عرض الرحلة: قوارير، ينابيع، آبار، أشغال */
type TripCategory = 'bottled' | 'spring' | 'well' | 'construction';
type TripStatus   = 'مكتمل' | 'ملغي' | 'مجدول';
type Tab          = 'previous' | 'scheduled';

interface OrderItem {
  id:       string;
  category: TripCategory;   // التخصص — يُستخدم للتصفية
  title:    string;
  date:     string;
  customer: string;
  price:    string;
  status:   TripStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * يُحدّد تصفية التخصص بناءً على نوع السائق ونوع المياه.
 *   Bottled              → 'bottled'
 *   Tanker + spring      → 'spring'
 *   Tanker + well        → 'well'
 *   Tanker + construction→ 'construction'
 */
function resolveCategory(
  driverType: string | undefined,
  waterType: string | undefined,
): TripCategory | null {
  if (driverType === 'Bottled') return 'bottled';
  if (driverType === 'Tanker') {
    if (waterType === 'spring')       return 'spring';
    if (waterType === 'well')         return 'well';
    if (waterType === 'construction') return 'construction';
  }
  return null; // سائق غير مسجل بعد
}

const categoryLabel: Record<TripCategory, string> = {
  bottled:      'توصيل عبوات',
  spring:       'مياه الينابيع',
  well:         'مياه الآبار',
  construction: 'مياه البناء',
};

const categoryIcon: Record<TripCategory, string> = {
  bottled:      'bottle-wine-outline',
  spring:       'water-outline',
  well:         'waves',
  construction: 'office-building-outline',
};

const statusConfig: Record<string, { bg: string; color: string }> = {
  مكتمل: { bg: '#DCFCE7', color: COLORS.success  },
  ملغي:  { bg: '#FEE2E2', color: COLORS.danger   },
  مجدول: { bg: '#DBEAFE', color: '#2563EB'       },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const OrderCard = ({ category, title, date, customer, price, status, cancelReason }: any) => {
  const badge = statusConfig[status] ?? { bg: 'rgba(241, 245, 249, 0.5)', color: COLORS.textSecondary };
  return (
    <BlurView intensity={70} tint="light" style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={categoryIcon[category as TripCategory] as any}
            size={24}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.orderTitle, status === 'ملغي' && { color: COLORS.danger }]}>{status === 'ملغي' ? 'رحلة ملغاة' : title}</Text>
          <Text style={styles.orderDate}>{date}</Text>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.customerName}>{customer}</Text>
          </View>
        </View>
      </View>

      {status === 'ملغي' && cancelReason ? (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: 'rgba(254, 242, 242, 0.8)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(254, 202, 202, 0.5)' }}>
          <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: COLORS.danger, textAlign: 'left' }}>السبب: {cancelReason}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.orderPrice}>{parseFloat(price).toLocaleString('ar-DZ')} د.ج</Text>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusTextBadge, { color: badge.color }]}>{status}</Text>
        </View>
      </View>
    </BlurView>
  );
};

const SpecializationBanner = ({ category }: { category: TripCategory }) => (
  <BlurView intensity={40} tint="light" style={styles.banner}>
    <MaterialCommunityIcons name={categoryIcon[category] as any} size={16} color={COLORS.primary} />
    <Text style={styles.bannerText}>{categoryLabel[category]}</Text>
  </BlurView>
);

const EmptyState = ({ tab }: { tab: Tab }) => (
  <View style={styles.emptyContainer}>
    <BlurView intensity={40} tint="light" style={styles.emptyIconWrap}>
      <MaterialCommunityIcons
        name={tab === 'previous' ? 'truck-check-outline' : 'calendar-clock-outline'}
        size={54}
        color="#94A3B8"
      />
    </BlurView>
    <Text style={styles.emptyTitle}>
      {tab === 'previous' ? 'لا توجد رحلات سابقة' : 'لا توجد رحلات مجدولة'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {tab === 'previous'
        ? 'ستظهر هنا رحلاتك المنجزة والملغاة'
        : 'ستظهر هنا رحلاتك القادمة المجدولة'}
    </Text>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DriverTripsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('previous');

  // قراءة تخصص السائق من الـ Store
  const registeredDriver = useDriverStore(s => s.registeredDriver);
  const driverType = registeredDriver?.driverType;
  const waterType  = registeredDriver?.waterType;

  const category = resolveCategory(driverType, waterType);

  const fetchPastTrips = useDriverStore(s => s.fetchPastTrips);
  
  useEffect(() => {
    fetchPastTrips();
  }, [fetchPastTrips]);

  const pastTripsFromStore = useDriverStore(s => s.pastTrips);
  
  // تصفية الرحلات حسب التخصص فقط
  // For scheduled we assume empty for now as backend doesn't support them fully yet
  const mappedPastTrips = pastTripsFromStore.map(pt => ({
    id: pt.id,
    category: category || 'bottled', 
    title: pt.orderSummary,
    date: pt.date + ' ' + pt.time,
    customer: pt.customerName,
    price: (Number(pt.amount) || 0).toFixed(2),
    status: pt.status === 'Completed' ? 'مكتمل' : 'ملغي',
    cancelReason: pt.cancelReason
  }));
  
  const finalFiltered = activeTab === 'previous' ? mappedPastTrips : [];

  // إجمالي الأرباح للرحلات المكتملة
  const totalEarned = finalFiltered
    .filter(o => o.status === 'مكتمل')
    .reduce((sum, o) => sum + parseFloat(o.price), 0);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isOnline = useDriverStore(s => s.isOnline);
  const bgColors = isOnline ? (['#F8FAFC', '#E2E8F0'] as const) : (['#F1F5F9', '#CBD5E1'] as const);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>سجل الرحلات</Text>
        {category && <SpecializationBanner category={category} />}
      </View>

      {/* Tabs (Segmented Control Style) */}
      <View style={styles.tabsContainer}>
        <BlurView intensity={50} tint="light" style={styles.segmentedControl}>
          {(['previous', 'scheduled'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => handleTabChange(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'previous' ? 'السابقة' : 'المجدولة'}
              </Text>
            </TouchableOpacity>
          ))}
        </BlurView>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <BlurView intensity={60} tint="light" style={styles.summaryChip}>
          <View style={styles.summaryIcon}><Ionicons name="car-outline" size={16} color={COLORS.primary} /></View>
          <View>
            <Text style={styles.summaryValue}>{finalFiltered.length}</Text>
            <Text style={styles.summaryLabel}>إجمالي الرحلات</Text>
          </View>
        </BlurView>
        {activeTab === 'previous' && totalEarned > 0 && (
          <BlurView intensity={60} tint="light" style={styles.summaryChip}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.secondary }]}><Ionicons name="wallet-outline" size={16} color={COLORS.primary} /></View>
            <View>
               <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{totalEarned.toLocaleString('ar-DZ')}</Text>
               <Text style={styles.summaryLabel}>أرباح (د.ج)</Text>
            </View>
          </BlurView>
        )}
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {finalFiltered.length === 0
          ? <EmptyState tab={activeTab} />
          : finalFiltered.map((order: any) => <OrderCard key={order.id} {...order} />)
        }
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },

  // Header
  header:      { paddingHorizontal: 20, paddingBottom: 10, alignItems: 'flex-start', gap: 8 },
  headerTitle: { fontSize: 32, fontFamily: 'Cairo-Black', color: COLORS.primary },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  bannerText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: COLORS.primary },

  // Tabs (Segmented Control)
  tabsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  tabText:       { fontSize: 15, fontFamily: 'Cairo-Bold',  color: '#64748B' },
  activeTabText: { color: COLORS.primary, fontFamily: 'Cairo-Black' },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  summaryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,33,71,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryValue: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary, marginBottom: -4 },
  summaryLabel: { fontSize: 12, fontFamily: 'Cairo-SemiBold',  color: '#64748B' },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 10 },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
  },
  cardMain:      { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
    borderWidth: 1,
    borderColor: '#EEF2F9',
  },
  infoContainer: { flex: 1, alignItems: 'flex-start' },
  orderTitle:    { fontSize: 16, fontFamily: 'Cairo-Black',   color: COLORS.primary      },
  orderDate:     { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: '#64748B', marginTop: 2 },
  customerRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4, backgroundColor: 'rgba(0,33,71,0.04)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  customerName:  { fontSize: 12, fontFamily: 'Cairo-Bold',    color: COLORS.primary },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,33,71,0.06)',
  },
  orderPrice:      { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary },
  statusBadge:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  statusTextBadge: { fontSize: 12, fontFamily: 'Cairo-Bold' },

  // Empty State
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  emptyTitle:     { fontSize: 20, fontFamily: 'Cairo-Black', color: '#64748B', textAlign: 'center' },
  emptySubtitle:  { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: '#94A3B8', textAlign: 'center' },
});
