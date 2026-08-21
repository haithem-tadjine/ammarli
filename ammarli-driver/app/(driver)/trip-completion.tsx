import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Truck, CheckCircle, ChevronLeft, MapPin } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDriverStore } from '../../src/store/useDriverStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── تسميات الأحجام ────────────────────────────────────────────────────────────
const SIZE_LABELS: Record<string, string> = {
  '0.25L': 'فاردو 0.25 لتر',
  '0.5L':  'فاردو 0.5 لتر',
  '1L':    'فاردو 1 لتر',
  '1.5L':  'فاردو 1.5 لتر',
  '2L':    'فاردو 2 لتر',
  '5L':    'بيدون 5 لتر',
  '10L':   'بيدون 10 لتر',
  '19L':   'بيدون 19 لتر',
  '20L':   'بيدون 20 لتر',
};
const getSizeLabel = (size: string): string => SIZE_LABELS[size] ?? size;

const { width } = Dimensions.get('window');

const COLORS = {
  primary:       '#002147',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  textSecondary: '#64748B',
  success:       '#22C55E',
};

export default function TripCompletionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    orderId: string;
    serviceType: string;
    price: string;
    customerName: string;
    items?: string;
    orderType?: string;
  }>();

  const { orderId, serviceType, price, customerName } = params;
  const parsedItems: { size: string; qty: number }[] = (() => {
    try { return params.items ? JSON.parse(params.items) : []; }
    catch { return []; }
  })();
  const isBottled = params.orderType === 'bottles';
  const completeDriverOrder = useDriverStore(state => state.completeDriverOrder);
  const isOnline = useDriverStore((s: any) => s.isOnline);
  
  const [isLoading, setIsLoading] = useState(false);

  // Animations
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const slideUpAnim = React.useRef(new Animated.Value(50)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the checkmark
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Slide up and fade in for the card
    Animated.parallel([
      Animated.timing(slideUpAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true })
    ]).start();
  }, []);

  const handleComplete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      await completeDriverOrder(0, orderId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/(driver)/customer-rating',
        params: { orderId: orderId, customerName: customerName ?? 'العميل', price: price ?? '0' }
      });
    } catch (error) {
      console.error('Failed to complete order:', error);
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const bgColors = isOnline ? (['#F8FAFC', '#E2E8F0'] as const) : (['#F1F5F9', '#CBD5E1'] as const);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>ملخص الرحلة</Text>
      </View>

      <View style={styles.content}>
        
        {/* Arrival Visual Icon (Glassmorphism) */}
        <Animated.View style={[styles.visualContainer, { opacity: fadeAnim }]}>
          <BlurView intensity={60} tint="light" style={styles.iconCircleBlur}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="truck-check-outline" size={60} color={COLORS.primary} />
              <Animated.View style={[styles.checkBadge, { transform: [{ scale: pulseAnim }] }]}>
                <CheckCircle size={28} color={COLORS.success} fill={COLORS.white} />
              </Animated.View>
            </View>
          </BlurView>
          <Text style={styles.arrivalStatus}>وصلت لوجهتك</Text>
        </Animated.View>

        {/* Summary Card (Glassmorphism) */}
        <Animated.View style={{ width: '100%', transform: [{ translateY: slideUpAnim }], opacity: fadeAnim }}>
          <BlurView intensity={70} tint="light" style={styles.summaryCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>تم الوصول إلى موقع الزبون</Text>
              <View style={styles.pinIconBox}>
                <MapPin size={18} color={COLORS.white} />
              </View>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoValue}>{serviceType ?? 'مياه آبار'}</Text>
              <Text style={styles.infoLabel}>نوع الخدمة:</Text>
            </View>

            {/* ── تفاصيل الأصناف — للمياه المعبأة فقط ── */}
            {isBottled && parsedItems.length > 0 && (
              <View style={styles.itemsSection}>
                <View style={styles.itemsSectionHeader}>
                  <MaterialCommunityIcons name="package-variant" size={16} color={COLORS.primary} />
                  <Text style={styles.itemsSectionTitle}>ما ستُسلّمه للزبون</Text>
                </View>
                {parsedItems.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemIconBox}>
                      <MaterialCommunityIcons name="bottle-soda-outline" size={16} color="#2563EB" />
                    </View>
                    <Text style={styles.itemLabel} numberOfLines={1}>
                      {getSizeLabel(item.size || '1.5L')}
                    </Text>
                    <View style={styles.itemQtyBadge}>
                      <Text style={styles.itemQtyText}>× {item.qty}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.divider} />

            <View style={[styles.infoRow, { marginTop: 4 }]}>
              <Text style={styles.totalValue}>{price ? `${Number(price).toLocaleString('ar-DZ')} د.ج` : '0 د.ج'}</Text>
              <Text style={styles.infoLabel}>المبلغ الإجمالي:</Text>
            </View>
          </BlurView>
        </Animated.View>

        {/* Muted Confirmation Text */}
        <Animated.Text style={[styles.confirmationText, { opacity: fadeAnim }]}>
          تأكد من تسليم الطلبية واستلام المبلغ قبل إنهاء الرحلة.
        </Animated.Text>

      </View>

      {/* Buttons Footer (Glassmorphism) */}
      <BlurView intensity={90} tint="light" style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          style={[styles.primaryButton, isLoading && { opacity: 0.8 }]} 
          activeOpacity={0.8}
          onPress={handleComplete}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <MaterialCommunityIcons name="check-decagram" size={24} color={COLORS.primary} />
              <Text style={styles.primaryButtonText}>تم التوصيل بنجاح</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          activeOpacity={0.6}
          onPress={handleBack}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>رجوع للتفاصيل</Text>
        </TouchableOpacity>
      </BlurView>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Cairo-Black',
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  visualContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircleBlur: {
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 2,
    elevation: 5,
  },
  arrivalStatus: {
    marginTop: 20,
    fontSize: 20,
    fontFamily: 'Cairo-Black',
    color: COLORS.primary,
  },
  
  summaryCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
  },
  pinIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,33,71,0.08)',
    marginVertical: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
  },
  totalValue: {
    fontSize: 22,
    fontFamily: 'Cairo-Black',
    color: COLORS.success,
  },

  // Items breakdown
  itemsSection: { marginTop: 15, marginBottom: 4 },
  itemsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  itemsSectionTitle: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(37,99,235,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
  },
  itemIconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(37,99,235,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  itemLabel: { flex: 1, fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary, textAlign: 'left' },
  itemQtyBadge: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  itemQtyText: { fontSize: 13, fontFamily: 'Cairo-Black', color: '#FFFFFF' },
  
  confirmationText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 35,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.7)',
  },
  primaryButton: {
    width: '100%',
    height: 60,
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    marginBottom: 15,
  },
  primaryButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontFamily: 'Cairo-Black',
  },
  secondaryButton: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,33,71,0.2)',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
  },
});
