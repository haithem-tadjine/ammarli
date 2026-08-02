import React from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  StatusBar, Dimensions, Platform
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useDriverStore } from '../../../src/store/useDriverStore';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#003366',
  secondary: '#F3CD0D',
  white: '#FFFFFF',
  background: '#F8FAFC',
  textSecondary: '#64748B',
  success: '#22C55E',
  danger: '#EF4444',
  border: '#F1F5F9',
};

const DriverEarningsScreen = () => {
  const insets = useSafeAreaInsets();

  const walletBalance = useDriverStore(state => state.walletBalance);
  const totalEarnings = useDriverStore(state => state.totalEarnings);
  const completedTrips = useDriverStore(state => state.completedTrips);
  const driverRating = useDriverStore(state => state.driverRating);
  const appCommissionDebt = useDriverStore(state => state.appCommissionDebt);
  const isSuspended = useDriverStore(state => state.isSuspended);
  const weeklyStats = useDriverStore(state => state.weeklyStats);
  const transactions = useDriverStore(state => state.transactions);

  const handleWithdraw = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // منطق السحب هنا
  };

  const DAY_MAP: Record<string, string> = {
    'SUN': 'الأحد', 'MON': 'الإثنين', 'TUE': 'الثلاثاء', 'WED': 'الأربعاء',
    'THU': 'الخميس', 'FRI': 'الجمعة', 'SAT': 'السبت'
  };

  const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const maxAmount = Math.max(...weeklyStats.map(s => s.amount), 1);
  
  const dynamicWeeklyData = weeklyStats.map((stat, idx) => ({
    day: DAY_MAP[stat.day] || stat.day,
    value: maxAmount > 1 ? (stat.amount / maxAmount) * 100 : 5,
    active: idx === currentDayIndex,
  }));

  return (
    <ScreenContainer backgroundColor="#FFF" statusBarStyle="dark-content" statusBarColor="#FFF">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header الموحد */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الأرباح</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name='chevron-forward' size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {/* بطاقة الرصيد الكبيرة */}
        <View style={styles.balanceCard}>
           <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>الرصيد الحالي (الأرباح)</Text>
              <Text style={styles.balanceValue}>{(walletBalance || 0).toLocaleString('ar-DZ')} <Text style={styles.currency}>د.ج</Text></Text>
           </View>
           {/* If we want to hide withdraw button or keep it, for now keep it */}
        </View>

        {/* الإحصائيات السريعة */}
        <View style={styles.statsRow}>
           <StatItem label="إجمالي الرحلات" value={completedTrips.toString()} icon="truck-delivery" isRating={false} />
           <StatItem label="التقييم" value={driverRating.toString()} icon="star" isRating={true} />
        </View>

        {/* بطاقة عمولة التطبيق (المديونية) */}
        <View style={[styles.debtCard, isSuspended && styles.suspendedCard]}>
           <View style={[styles.debtIconBox, isSuspended && { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name={isSuspended ? "alert-circle" : "receipt"} size={24} color={COLORS.danger} />
           </View>
           <View style={styles.debtInfo}>
              <Text style={[styles.debtLabel, isSuspended && { color: COLORS.danger }]}>عمولة التطبيق</Text>
              <Text style={styles.debtSubLabel}>المبالغ المستحقة للبرنامج</Text>
           </View>
           <View style={styles.debtAmountContainer}>
              <Text style={styles.debtValue}>{(appCommissionDebt || 0).toLocaleString('ar-DZ')} د.ج</Text>
              <Text style={styles.debtStatus}>
                 {isSuspended ? '• تم الإيقاف (يرجى التسديد)' : '• مستحق الدفع'}
              </Text>
           </View>
        </View>

        {/* الرسم البياني الأسبوعي */}
        <View style={styles.chartCard}>
           <Text style={styles.chartTitle}>إحصائيات الأسبوع</Text>
           <View style={styles.chartContainer}>
             {dynamicWeeklyData.map((item, index) => (
               <View key={index} style={styles.barWrapper}>
                  <View style={styles.barTrack}>
                     <View style={[styles.barFill, { height: `${item.value}%` }, item.active && styles.barActive]} />
                  </View>
                  <Text style={[styles.dayLabel, item.active && {color: COLORS.primary}]}>{item.day}</Text>
               </View>
             ))}
           </View>
        </View>

        {/* العمليات الأخيرة */}
        <View style={styles.sectionHeader}>
           <TouchableOpacity><Text style={styles.seeAllText}>عرض الكل</Text></TouchableOpacity>
           <Text style={styles.sectionTitle}>العمليات الأخيرة</Text>
        </View>

        <View style={styles.transactionsList}>
           {transactions.length === 0 ? (
             <Text style={{ textAlign: 'center', color: COLORS.textSecondary, marginTop: 20, fontFamily: 'Cairo-Regular' }}>لا توجد عمليات بعد</Text>
           ) : (
             transactions.map((t, idx) => (
               <TransactionItem key={t.id || idx} name={t.customerName} date={t.date} amount={(t.amount || 0).toLocaleString('ar-DZ')} />
             ))
           )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

// مكونات فرعية ذكية
const StatItem = ({ label, value, icon, isRating }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconBox, isRating && {backgroundColor: '#FFFBEB'}]}>
       {isRating ? <Ionicons name={icon} size={20} color={COLORS.primary} /> : <MaterialCommunityIcons name={icon} size={22} color={COLORS.primary} />}
    </View>
    <View style={{alignItems: 'flex-start'}}>
       <Text style={styles.statLabel}>{label}</Text>
       <Text style={styles.statValue}>{value}</Text>
    </View>
  </View>
);

const TransactionItem = ({ name, date, amount }: any) => (
  <View style={styles.transItem}>
    <View style={styles.transAddBtn}><Ionicons name="add" size={20} color={COLORS.white} /></View>
    <View style={{flex: 1, alignItems: 'flex-start'}}>
       <Text style={styles.transName}>{name}</Text>
       <Text style={styles.transDate}>{date}</Text>
    </View>
    <View style={{alignItems: 'flex-start'}}>
       <Text style={styles.transAmount}>{amount} د.ج</Text>
       <Text style={styles.transStatus}>مكتمل</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, height: 60, backgroundColor: COLORS.white },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  balanceCard: { backgroundColor: COLORS.primary, borderRadius: 28, padding: 25, elevation: 8, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 15 },
  balanceInfo: { alignItems: 'flex-start', marginBottom: 20 },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  balanceValue: { fontSize: 38, fontWeight: '900', color: COLORS.white },
  currency: { fontSize: 18, fontWeight: '700' },
  withdrawBtn: { backgroundColor: COLORS.secondary, height: 54, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  withdrawText: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  statCard: { width: (width - 55) / 2, backgroundColor: COLORS.white, borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 2 },
  statIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  statValue: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  debtCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#FEE2E2' },
  suspendedCard: { backgroundColor: '#FEF2F2', borderColor: COLORS.danger, borderWidth: 2 },
  debtIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  debtInfo: { flex: 1, alignItems: 'flex-start' },
  debtLabel: { fontSize: 17, fontWeight: '900', color: COLORS.primary },
  debtSubLabel: { fontSize: 11, color: COLORS.textSecondary },
  debtAmountContainer: { alignItems: 'flex-start' },
  debtValue: { fontSize: 17, fontWeight: '900', color: COLORS.danger },
  debtStatus: { fontSize: 10, color: COLORS.danger, fontWeight: '800' },
  chartCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 20, marginTop: 20 },
  chartTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary, textAlign: 'left', marginBottom: 20 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', height: 120 },
  barWrapper: { alignItems: 'center', width: (width - 100) / 7 },
  barTrack: { height: 100, width: 14, backgroundColor: '#F1F5F9', borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#CBD5E1', borderRadius: 10 },
  barActive: { backgroundColor: COLORS.secondary },
  dayLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textSecondary, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  seeAllText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  transactionsList: { paddingBottom: 20 },
  transItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 20, padding: 15, marginBottom: 10 },
  transAddBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transName: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  transDate: { fontSize: 11, color: COLORS.textSecondary },
  transAmount: { fontSize: 15, fontWeight: '900', color: '#10B981' },
  transStatus: { fontSize: 10, color: '#10B981', fontWeight: '800', textAlign: 'left' },
});

export default DriverEarningsScreen;
