import React from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  StatusBar, Dimensions, Platform
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

  const isOnline = useDriverStore(s => s.isOnline);
  const bgColors = isOnline ? (['#F8FAFC', '#E2E8F0'] as const) : (['#F1F5F9', '#CBD5E1'] as const);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />
      
      {/* Header الموحد */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconBtn}>
          <BlurView intensity={50} tint="light" style={styles.iconWrap}>
             <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الأرباح</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <BlurView intensity={50} tint="light" style={styles.iconWrap}>
             <Ionicons name='chevron-forward' size={24} color={COLORS.primary} />
          </BlurView>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {/* بطاقة الرصيد الكبيرة */}
        <BlurView intensity={70} tint="light" style={styles.balanceCard}>
           <LinearGradient colors={['rgba(0,51,102,0.85)', 'rgba(0,51,102,0.95)']} style={StyleSheet.absoluteFillObject} />
           <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>الرصيد الحالي (الأرباح)</Text>
              <Text style={styles.balanceValue}>{(walletBalance || 0).toLocaleString('ar-DZ')} <Text style={styles.currency}>د.ج</Text></Text>
           </View>
        </BlurView>

        {/* الإحصائيات السريعة */}
        <View style={styles.statsRow}>
           <StatItem label="إجمالي الرحلات" value={completedTrips.toString()} icon="truck-delivery" isRating={false} />
           <StatItem label="التقييم" value={driverRating.toString()} icon="star" isRating={true} />
        </View>

        {/* بطاقة عمولة التطبيق (المديونية) */}
        <BlurView intensity={70} tint="light" style={[styles.debtCard, isSuspended && styles.suspendedCard]}>
           <View style={[styles.debtIconBox, isSuspended && { backgroundColor: 'rgba(254, 242, 242, 0.8)' }]}>
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
        </BlurView>

        {/* الرسم البياني الأسبوعي */}
        <BlurView intensity={70} tint="light" style={styles.chartCard}>
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
        </BlurView>

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
    </View>
  );
};

// مكونات فرعية ذكية
const StatItem = ({ label, value, icon, isRating }: any) => (
  <BlurView intensity={70} tint="light" style={styles.statCard}>
    <View style={[styles.statIconBox, isRating && {backgroundColor: 'rgba(255,251,235,0.7)'}]}>
       {isRating ? <Ionicons name={icon} size={20} color={COLORS.secondary} /> : <MaterialCommunityIcons name={icon} size={22} color={COLORS.primary} />}
    </View>
    <View style={{alignItems: 'flex-start'}}>
       <Text style={styles.statLabel}>{label}</Text>
       <Text style={styles.statValue}>{value}</Text>
    </View>
  </BlurView>
);

const TransactionItem = ({ name, date, amount }: any) => (
  <BlurView intensity={70} tint="light" style={styles.transItem}>
    <View style={styles.transAddBtn}><Ionicons name="add" size={20} color={COLORS.white} /></View>
    <View style={{flex: 1, alignItems: 'flex-start'}}>
       <Text style={styles.transName}>{name}</Text>
       <Text style={styles.transDate}>{date}</Text>
    </View>
    <View style={{alignItems: 'flex-start'}}>
       <Text style={styles.transAmount}>{amount} د.ج</Text>
       <Text style={styles.transStatus}>مكتمل</Text>
    </View>
  </BlurView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontFamily: 'Cairo-Black', color: COLORS.primary },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  
  balanceCard: { borderRadius: 28, padding: 25, elevation: 4, shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 20 },
  balanceInfo: { alignItems: 'flex-start' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Cairo-SemiBold', marginBottom: 5 },
  balanceValue: { fontSize: 42, fontFamily: 'Cairo-Black', color: COLORS.white, marginBottom: -8 },
  currency: { fontSize: 18, fontFamily: 'Cairo-Bold' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  statIconBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(0,33,71,0.06)', justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, fontFamily: 'Cairo-SemiBold', color: '#64748B' },
  statValue: { fontSize: 22, fontFamily: 'Cairo-Black', color: COLORS.primary, marginTop: -2 },
  
  debtCard: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  suspendedCard: { backgroundColor: 'rgba(254,242,242,0.8)', borderColor: '#FCA5A5', borderWidth: 1.5 },
  debtIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  debtInfo: { flex: 1, alignItems: 'flex-start' },
  debtLabel: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary },
  debtSubLabel: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'Cairo-SemiBold' },
  debtAmountContainer: { alignItems: 'flex-start' },
  debtValue: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.danger },
  debtStatus: { fontSize: 10, color: COLORS.danger, fontFamily: 'Cairo-Bold' },
  
  chartCard: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 28, padding: 20, marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  chartTitle: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary, textAlign: 'left', marginBottom: 20 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', height: 120 },
  barWrapper: { alignItems: 'center', width: (width - 100) / 7 },
  barTrack: { height: 100, width: 14, backgroundColor: 'rgba(0,33,71,0.05)', borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#CBD5E1', borderRadius: 10 },
  barActive: { backgroundColor: COLORS.secondary },
  dayLabel: { fontSize: 10, fontFamily: 'Cairo-Bold', color: '#94A3B8', marginTop: 8 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary },
  seeAllText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Cairo-Bold' },
  
  transactionsList: { paddingBottom: 20 },
  transItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
  transAddBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2, shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 5 },
  transName: { fontSize: 15, fontFamily: 'Cairo-Black', color: COLORS.primary },
  transDate: { fontSize: 11, color: '#64748B', fontFamily: 'Cairo-SemiBold', marginTop: 2 },
  transAmount: { fontSize: 16, fontFamily: 'Cairo-Black', color: '#10B981' },
  transStatus: { fontSize: 11, color: '#10B981', fontFamily: 'Cairo-Bold', textAlign: 'left' },
});

export default DriverEarningsScreen;
