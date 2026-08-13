import React, { useState, useEffect } from 'react';
import ScreenContainer from '../../components/ScreenContainer';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, CheckCircle2, Wallet, Calendar, AlertCircle, Bell, Truck } from 'lucide-react-native';
import { useDriverStore, DriverNotification } from '../../src/store/useDriverStore';
import { SkeletonList } from '../../components/SkeletonLoader';
import Svg, { Circle, Path, Line } from 'react-native-svg';

const THEME_NAVY = '#012047';
const THEME_GOLD = '#FFCC00';
const THEME_DANGER = '#EF4444';

export default function DriverNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const notifications = useDriverStore((s) => s.notifications);
  const markAllNotificationsAsRead = useDriverStore((s) => s.markAllNotificationsAsRead);
  const markNotificationRead = useDriverStore((s) => s.markNotificationRead);
  const clearNotifications = useDriverStore((s) => s.clearNotifications);

  // عند فتح الصفحة نضع كل الإشعارات كمقروءة بعد ثانيتين
  useEffect(() => {
    const timer = setTimeout(() => {
      markAllNotificationsAsRead();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const getIcon = (type: DriverNotification['type']) => {
    switch (type) {
      case 'order':    return <Truck        color={THEME_GOLD} size={24} strokeWidth={2.5} />;
      case 'schedule': return <Calendar     color={THEME_GOLD} size={24} strokeWidth={2.5} />;
      case 'fee':      return <AlertCircle  color={THEME_DANGER} size={24} strokeWidth={2.5} />;
      case 'wallet':   return <Wallet       color={THEME_GOLD} size={24} strokeWidth={2.5} />;
      case 'system':   return <Bell         color={THEME_GOLD} size={24} strokeWidth={2.5} />;
      default:         return <Bell         color={THEME_GOLD} size={24} strokeWidth={2.5} />;
    }
  };

  const NotificationCard = React.memo(({ item }: { item: DriverNotification }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.unreadCard]}
      activeOpacity={0.85}
      onPress={() => {
        markNotificationRead(item.id);
        if (item.type === 'schedule' || item.type === 'order') {
          router.push('/(driver)/(tabs)'); // او أي صفحة مناسبة للسائق
        } else if (item.type === 'wallet' || item.type === 'fee') {
          router.push('/(driver)/(tabs)/wallet');
        }
      }}
    >
      {/* الخط الجانبي يعتمد على نوع الإشعار */}
      <View style={[styles.sideline, { backgroundColor: item.type === 'fee' ? THEME_DANGER : THEME_GOLD }]} />

      <View style={styles.cardMainContent}>
        {/* Header: وقت + نقطة غير مقروء */}
        <View style={styles.cardHeader}>
          {!item.isRead && <View style={styles.unreadPulse} />}
          <Text style={styles.timeText}>{item.time}</Text>
        </View>

        {/* الصف الرئيسي: نص + أيقونة */}
        <View style={styles.contentRow}>
          <View style={styles.textContent}>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
          <View style={styles.iconContainer}>
            {getIcon(item.type)}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ));
  NotificationCard.displayName = 'NotificationCard';

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={[styles.safeArea, { paddingTop: insets.top }, { paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={clearNotifications} style={styles.clearBtn}>
            <Text style={styles.clearAllText}>مسح الكل</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>إشعارات السائق</Text>

          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronRight color={THEME_NAVY} size={30} />
          </TouchableOpacity>
        </View>

        {/* Badge عدد غير المقروء */}
        {notifications.filter((n) => !n.isRead).length > 0 && (
          <View style={styles.unreadBanner}>
            <Text style={styles.unreadBannerText}>
              لديك {notifications.filter((n) => !n.isRead).length} إشعار جديد غير مقروء
            </Text>
          </View>
        )}

        {/* قائمة الإشعارات */}
        {isLoading ? (
          <FlatList
            data={[]}
            keyExtractor={(_, i) => String(i)}
            renderItem={() => null}
            ListHeaderComponent={<SkeletonList type="notification" count={4} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={emptyStyles.container}>
              <Svg width={110} height={110} viewBox="0 0 110 110" fill="none">
                <Circle cx="55" cy="55" r="52" fill="#F0F4FF" />
                <Circle cx="55" cy="42" r="18" fill="#E2E8F0" />
                <Path d="M37 42 Q37 60 55 65 Q73 60 73 42" fill="#CBD5E1" />
                <Line x1="55" y1="30" x2="55" y2="38" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
                <Circle cx="55" cy="55" r="6" fill="#FFCC00" />
              </Svg>
              <Text style={emptyStyles.title}>صندوق الوارد فارغ</Text>
              <Text style={emptyStyles.subtitle}>ستظهر هنا إشعارات الطلبات، الخصومات والمحفظة</Text>
              <TouchableOpacity
                style={emptyStyles.ctaButton}
                onPress={() => router.replace('/(driver)/(tabs)')}
                activeOpacity={0.8}
              >
                <Text style={emptyStyles.ctaText}>تصفح الرئيسية</Text>
              </TouchableOpacity>
            </View>
          }
        />
        )}
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

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearAllText: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: 'Cairo-SemiBold',
  },
  backButton: {
    padding: 4,
  },

  // ─── Unread Banner ─────────────────────────────────────────────────────────
  unreadBanner: {
    backgroundColor: THEME_NAVY,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  unreadBannerText: {
    color: THEME_GOLD,
    fontFamily: 'Cairo-Bold',
    fontSize: 13,
  },

  // ─── List ──────────────────────────────────────────────────────────────────
  listContent: {
    padding: 20,
    paddingBottom: 50,
  },

  // ─── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: THEME_NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  unreadCard: {
    backgroundColor: '#FFFEF5',
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.25)',
  },
  sideline: {
    width: 5,
  },
  cardMainContent: {
    flex: 1,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  unreadPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF', // Blue dot
  },
  timeText: {
    fontSize: 12,
    color: '#ADB5BD',
    fontFamily: 'Cairo-SemiBold',
    flex: 1,
    textAlign: 'left',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textContent: {
    flex: 1,
    marginLeft: 14,
  },
  titleText: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    textAlign: 'left',
    marginBottom: 5,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6C757D',
    fontFamily: 'Cairo-Regular',
    textAlign: 'left',
    lineHeight: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#F8F9FB',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
});

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 30 },
  title: { fontSize: 20, fontFamily: 'Cairo-Bold', color: THEME_NAVY, textAlign: 'center', marginTop: 24, marginBottom: 10 },
  subtitle: { fontSize: 14, fontFamily: 'Cairo-Regular', color: '#8E8E93', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  ctaButton: {
    backgroundColor: THEME_GOLD, paddingHorizontal: 36, paddingVertical: 14,
    borderRadius: 30, elevation: 4,
    shadowColor: THEME_GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  ctaText: { fontSize: 16, fontFamily: 'Cairo-Bold', color: THEME_NAVY },
});
