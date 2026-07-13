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
  const badge = statusConfig[status] ?? { bg: '#F1F5F9', color: COLORS.textSecondary };
  return (
    <View style={styles.card}>
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
        <View style={{ marginTop: 10, padding: 10, backgroundColor: '#FEF2F2', borderRadius: 10 }}>
          <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: COLORS.danger, textAlign: 'left' }}>السبب: {cancelReason}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusTextBadge, { color: badge.color }]}>{status}</Text>
        </View>
      </View>
    </View>
  );
};

const SpecializationBanner = ({ category }: { category: TripCategory }) => (
  <View style={styles.banner}>
    <MaterialCommunityIcons name={categoryIcon[category] as any} size={18} color={COLORS.primary} />
    <Text style={styles.bannerText}>{categoryLabel[category]}</Text>
  </View>
);

const EmptyState = ({ tab }: { tab: Tab }) => (
  <View style={styles.emptyContainer}>
    <MaterialCommunityIcons
      name={tab === 'previous' ? 'truck-check-outline' : 'calendar-clock-outline'}
      size={64}
      color="#CBD5E1"
    />
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
    price: pt.amount.toFixed(2),
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

  return (
    <ScreenContainer backgroundColor="#FFF" statusBarStyle="dark-content" statusBarColor="#FFF">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>سجل الرحلات</Text>
        {category && <SpecializationBanner category={category} />}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
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
            {activeTab === tab && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryValue}>{finalFiltered.length}</Text>
          <Text style={styles.summaryLabel}>رحلة</Text>
        </View>
        {activeTab === 'previous' && totalEarned > 0 && (
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{totalEarned.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>د.ج مكتسبة</Text>
          </View>
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
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },

  // Header
  header:      { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 8, alignItems: 'flex-start', gap: 6 },
  headerTitle: { fontSize: 28, fontFamily: 'Cairo-Black', color: COLORS.primary },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  bannerText: { fontSize: 12, fontFamily: 'Cairo-Bold', color: COLORS.primary },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginLeft: 5,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab:          {},
  activeTabIndicator: {
    position: 'absolute',
    bottom: -1,
    right: 0,
    left: 0,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  tabText:       { fontSize: 16, fontFamily: 'Cairo-Bold',  color: COLORS.textSecondary },
  activeTabText: { color: COLORS.primary, fontFamily: 'Cairo-Black' },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  summaryValue: { fontSize: 15, fontFamily: 'Cairo-Black', color: COLORS.primary  },
  summaryLabel: { fontSize: 12, fontFamily: 'Cairo-Bold',  color: COLORS.textSecondary },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 5 },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  cardMain:      { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#EEF2F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  infoContainer: { flex: 1, alignItems: 'flex-start' },
  orderTitle:    { fontSize: 16, fontFamily: 'Cairo-Bold',    color: COLORS.primary      },
  orderDate:     { fontSize: 12, fontFamily: 'Cairo-Regular', color: COLORS.textSecondary, marginTop: 2 },
  customerRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 4 },
  customerName:  { fontSize: 13, fontFamily: 'Cairo-Bold',    color: COLORS.textSecondary },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  orderPrice:      { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
  statusBadge:     { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10 },
  statusTextBadge: { fontSize: 12, fontFamily: 'Cairo-Bold' },

  // Empty State
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle:     { fontSize: 18, fontFamily: 'Cairo-Bold',    color: '#94A3B8', textAlign: 'center' },
  emptySubtitle:  { fontSize: 13, fontFamily: 'Cairo-Regular', color: '#CBD5E1', textAlign: 'center' },
});
