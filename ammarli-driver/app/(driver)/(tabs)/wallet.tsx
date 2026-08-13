import React from 'react';
import Svg, { Path, Circle, G, Line, Text as SvgText } from 'react-native-svg';
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
        {/* بطاقات الرصيد والأرباح (مقسمة إلى اثنين) */}
        <View style={styles.topCardsRow}>
          {/* بطاقة الأرباح الصافية */}
          <BlurView intensity={70} tint="light" style={styles.halfCard}>
             <LinearGradient colors={['rgba(0,51,102,0.85)', 'rgba(0,51,102,0.95)']} style={StyleSheet.absoluteFillObject} />
             <View style={styles.halfCardInfo}>
                <View style={styles.halfCardIconBox}>
                  <Ionicons name="cash" size={18} color={COLORS.secondary} />
                </View>
                <Text style={styles.halfCardLabel}>الأرباح الصافية</Text>
                <Text style={styles.halfCardValue}>{Math.max(0, (totalEarnings || 0) - (appCommissionDebt || 0)).toLocaleString('ar-DZ')} <Text style={styles.halfCardCurrency}>د.ج</Text></Text>
             </View>
          </BlurView>

          {/* بطاقة الرصيد المشحون */}
          <BlurView intensity={70} tint="light" style={styles.halfCard}>
             <LinearGradient colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.95)']} style={StyleSheet.absoluteFillObject} />
             <View style={styles.halfCardInfo}>
                <View style={[styles.halfCardIconBox, { backgroundColor: 'rgba(243,205,13,0.15)' }]}>
                  <Ionicons name="wallet" size={18} color={COLORS.secondary} />
                </View>
                <Text style={[styles.halfCardLabel, { color: COLORS.textSecondary }]}>الرصيد المشحون</Text>
                <Text style={[styles.halfCardValue, { color: COLORS.primary }]}>{(walletBalance || 0).toLocaleString('ar-DZ')} <Text style={[styles.halfCardCurrency, { color: COLORS.primary }]}>د.ج</Text></Text>
             </View>
          </BlurView>
        </View>

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
           <Text style={styles.chartTitle}>نشاط الأسبوع (عدد الطلبيات)</Text>
           <View style={{ alignItems: 'center', marginTop: 10, overflow: 'hidden' }}>
             <CustomLineChart 
               data={weeklyStats.map(s => s.ordersCount || 0)} 
               labels={weeklyStats.map(s => DAY_MAP[s.day] || s.day)} 
             />
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

// ── مكون الرسم البياني المخصص (الأيام أفقياً، والنشاط عمودياً) ──
const CustomLineChart = ({ data, labels }: { data: number[], labels: string[] }) => {
  const chartWidth = width - 80;
  const chartHeight = 220;
  const padLeft = 25;
  const padRight = 15;
  const padTop = 20;
  const padBottom = 20;

  const maxData = Math.max(...data, 5); 

  const graphWidth = chartWidth - padLeft - padRight;
  const graphHeight = chartHeight - padTop - padBottom;

  const stepX = graphWidth / (data.length - 1 || 1);
  const stepY = graphHeight / maxData;

  const points = data.map((val, index) => {
    const x = padLeft + index * stepX;
    const y = chartHeight - padBottom - val * stepY;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, point, idx) => {
    return idx === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, '');

  // الشبكة الأفقية (الأرقام)
  const yGridLines = [];
  for (let i = 0; i <= maxData; i++) {
    yGridLines.push(i);
  }

  return (
    <View style={{ width: chartWidth, height: chartHeight + 20 }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* 1. الشبكة المتعامدة (الخطوط) */}
        <G>
          {/* الخطوط الأفقية (عدد الطلبات) */}
          {yGridLines.map(val => {
            const yPos = chartHeight - padBottom - val * stepY;
            return (
              <Line key={`h-${val}`} x1={padLeft} y1={yPos} x2={chartWidth - padRight + 10} y2={yPos} stroke="rgba(0,51,102,0.05)" strokeWidth="1" />
            );
          })}
          {/* الخطوط العمودية (الأيام) */}
          {points.map((p, i) => (
            <Line key={`v-${i}`} x1={p.x} y1={padTop - 10} x2={p.x} y2={chartHeight - padBottom} stroke="rgba(0,51,102,0.05)" strokeWidth="1" />
          ))}
        </G>

        {/* 2. المنحنى (الخط) */}
        <Path d={pathD} fill="none" stroke={COLORS.secondary} strokeWidth="3" />

        {/* 3. النقاط (الدوائر) */}
        {points.map((p, i) => (
          <Circle key={`c-${i}`} cx={p.x} cy={p.y} r="5" fill={COLORS.white} stroke={COLORS.primary} strokeWidth="2" />
        ))}
      </Svg>

      {/* 4. نصوص المحاور باستخدام Text العادي لحل مشكلة اللغة العربية في الـ SVG */}
      
      {/* نصوص المحور الصادي (عدد الطلبات) */}
      {yGridLines.map(val => {
        const yPos = chartHeight - padBottom - val * stepY;
        return (
          <View key={`ty-${val}`} style={{ position: 'absolute', top: yPos - 8, left: 0, width: padLeft - 5, alignItems: 'flex-end' }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'Cairo-Bold' }}>{val}</Text>
          </View>
        );
      })}

      {/* نصوص المحور السيني (الأيام) */}
      {labels.map((lbl, i) => (
        <View key={`lx-${i}`} style={{ position: 'absolute', top: chartHeight - 15, left: points[i].x - 30, width: 60, alignItems: 'center' }}>
          <Text style={{ color: COLORS.primary, fontSize: 10, fontFamily: 'Cairo-Bold', textAlign: 'center' }}>{lbl}</Text>
        </View>
      ))}

      {/* الأرقام التفاعلية فوق النقاط */}
      {points.map((p, i) => (
        p.val > 0 ? (
          <View key={`pt-${i}`} style={{ position: 'absolute', top: p.y - 25, left: p.x - 15, width: 30, alignItems: 'center' }}>
            <Text style={{ color: COLORS.primary, fontSize: 13, fontFamily: 'Cairo-Black', textAlign: 'center' }}>{p.val}</Text>
          </View>
        ) : null
      ))}
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
  
  topCardsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  halfCard: { flex: 1, borderRadius: 24, padding: 18, elevation: 4, shadowColor: COLORS.primary, shadowOpacity: 0.1, shadowRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  halfCardInfo: { alignItems: 'flex-start' },
  halfCardIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  halfCardLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: 'Cairo-Bold', marginBottom: 4 },
  halfCardValue: { fontSize: 24, fontFamily: 'Cairo-Black', color: COLORS.white, marginBottom: -4 },
  halfCardCurrency: { fontSize: 12, fontFamily: 'Cairo-Bold', color: 'rgba(255,255,255,0.7)' },
  
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
