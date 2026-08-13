import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ─── أنواع الطلبيات ────────────────────────────────────────────────────────────

export const ORDER_TYPES = {
  BOTTLES:      'bottles',
  WELL:         'well_water',
  CONSTRUCTION: 'construction_water',
  SPRING:       'spring_water',
} as const;

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

const COLORS = {
  primary:       '#003366',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  textSecondary: '#64748B',
  accentOrange:  '#D97706',
};

// ─── تفاصيل الطلب حسب التخصص ─────────────────────────────────────────────────

const getOrderDetails = (orderType: OrderType, quantityString: string) => {
  switch (orderType) {
    case ORDER_TYPES.BOTTLES:
      return {
        title: quantityString ? `${quantityString} مياه معدنية معبأة` : 'مياه معدنية معبأة',
        icon:  'bottle-wine-outline' as const,
        iconBg: '#F0FDF4',
        iconColor: '#16A34A',
        sub:   'مياه معدنية معبأة',
      };
    case ORDER_TYPES.WELL:
      return {
        title: quantityString ? `صهريج ${quantityString} مياه آبار` : 'صهريج مياه آبار',
        icon:  'water-well-outline' as const,
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
        sub:   'تعبئة مياه من بئر مرخص',
      };
    case ORDER_TYPES.CONSTRUCTION:
      return {
        title: quantityString ? `صهريج ${quantityString} مياه أشغال` : 'صهريج مياه أشغال (بناء)',
        icon:  'dump-truck' as const,
        iconBg: '#FFF7ED',
        iconColor: COLORS.accentOrange,
        sub:   'مياه مخصصة لورشات البناء',
      };
    default: // SPRING
      return {
        title: quantityString ? `صهريج ${quantityString} مياه نبع` : 'صهريج مياه نبع',
        icon:  'water' as const,
        iconBg: '#F0F9FF',
        iconColor: '#0284C7',
        sub:   'مياه ينابيع طبيعية مجزأة',
      };
  }
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface NewOrderCardProps {
  orderType?:    OrderType;
  customerName?: string;
  distance?:     string;
  rating?:       number;
  price?:        number;
  address?:      string;
  quantity?:     string;
  totalSeconds?: number;
  onAccept?:     () => void;
  onDecline?:    () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const NewOrderCard = ({
  orderType    = ORDER_TYPES.SPRING,
  customerName = 'ياسين',
  distance     = '2.5 كم',
  rating       = 4.8,
  price        = 2500,
  address      = 'التوصيل إلى إقامة الأزهر، الجزائر العاصمة',
  quantity     = '',
  totalSeconds = 15,
  onAccept,
  onDecline,
}: NewOrderCardProps) => {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);

  // العداد التنازلي
  useEffect(() => {
    if (timeLeft === 0) {
      onDecline?.(); // انتهت الصلاحية → اعتبرها مرفوضة
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // إعدادات الدائرة SVG
  const size        = 130;
  const strokeWidth = 7;
  const radius      = (size - strokeWidth) / 2;
  const circumference     = 2 * Math.PI * radius;
  const strokeDashoffset  = circumference * (1 - timeLeft / totalSeconds);

  const details = getOrderDetails(orderType, quantity);

  // لون الإلحاح (يتحول للأحمر إذا بقي أقل من 5 ثواني)
  const urgentColor = timeLeft <= 5 ? '#EF4444' : COLORS.secondary;

  return (
    <View style={styles.card}>

      {/* ── Header: الزبون + السعر ── */}
      <View style={styles.headerRow}>
        {/* السعر (يسار في RTL) */}
        <View style={styles.priceSection}>
          <Text style={styles.newOrderLabel}>طلب جديد</Text>

        </View>

        {/* الزبون (يمين في RTL) */}
        <View style={styles.customerSection}>
          <View style={styles.customerText}>
            <Text style={styles.customerName}>{customerName}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.distanceText}>على بعد {distance}</Text>
              <View style={styles.dot} />
              <Text style={styles.ratingValue}>{rating}</Text>
              <Ionicons name="star" size={12} color={COLORS.secondary} />
            </View>
          </View>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account" size={30} color={COLORS.white} />
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── التفاصيل: المنتج + العنوان ── */}
      <View style={styles.detailsRow}>
        <View style={styles.infoTextContainer}>
          <Text style={styles.productTitle}>{details.title}</Text>
          <Text style={styles.addressText}>{address}</Text>
        </View>
        <View style={[styles.iconBox, { backgroundColor: details.iconBg }]}>
          <MaterialCommunityIcons name={details.icon} size={22} color={details.iconColor} />
        </View>
      </View>

      {/* ── صلاحية الطلب ── */}
      <View style={styles.expiryRow}>
        <Ionicons name="time-outline" size={14} color={timeLeft <= 5 ? '#EF4444' : COLORS.textSecondary} />
        <Text style={[styles.expiryText, timeLeft <= 5 && { color: '#EF4444' }]}>
          تنتهي صلاحية الطلب خلال {timeLeft} ثانية
        </Text>
      </View>

      {/* ── العداد الدائري + أزرار ── */}
      <View style={styles.actionSection}>
        <View style={styles.timerContainer}>
          <Svg width={size} height={size}>
            {/* الخلفية */}
            <Circle
              stroke="#E2E8F0"
              fill="none"
              cx={size / 2} cy={size / 2} r={radius}
              strokeWidth={strokeWidth}
            />
            {/* التقدم */}
            <Circle
              stroke={urgentColor}
              fill="none"
              cx={size / 2} cy={size / 2} r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>

          {/* زر القبول داخل الدائرة */}
          <TouchableOpacity
            style={[styles.acceptCircle, { backgroundColor: urgentColor }]}
            activeOpacity={0.9}
            onPress={onAccept}
          >
            <Text style={styles.acceptLabel}>قبول</Text>
          </TouchableOpacity>
        </View>

        {/* زر الرفض */}
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline} activeOpacity={0.7}>
          <Text style={styles.declineLabel}>رفض</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 35,
    padding: 25,
    width: width * 0.9,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },

  // Header
  headerRow:       { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  customerSection: { flexDirection: 'row-reverse', alignItems: 'center' },
  customerText:    { alignItems: 'flex-end', marginRight: 12 },
  customerName:    { fontSize: 22, fontFamily: 'Cairo-Black', color: COLORS.primary },
  ratingRow:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  distanceText:    { fontSize: 13, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary },
  ratingValue:     { fontSize: 14, fontFamily: 'Cairo-Black', color: COLORS.primary },
  dot:             { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },
  avatarCircle:    { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFA500', justifyContent: 'center', alignItems: 'center' },
  priceSection:    { alignItems: 'flex-start' },
  newOrderLabel:   { fontSize: 13, fontFamily: 'Cairo-Black', color: COLORS.accentOrange, marginBottom: 2 },
  priceText:       { fontSize: 26, fontFamily: 'Cairo-Black', color: COLORS.primary },
  currency:        { fontSize: 14 },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },

  // Details
  detailsRow:          { flexDirection: 'row-reverse', alignItems: 'center', gap: 15 },
  iconBox:             { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  infoTextContainer:   { flex: 1, alignItems: 'flex-end' },
  productTitle:        { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
  addressText:         { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, marginTop: 3 },

  // Expiry
  expiryRow:  { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', marginTop: 15, gap: 5 },
  expiryText: { fontSize: 13, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary },

  // Timer + Accept
  actionSection:  { alignItems: 'center', marginTop: 20 },
  timerContainer: { width: 130, height: 130, justifyContent: 'center', alignItems: 'center' },
  acceptCircle: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  acceptLabel: { fontSize: 22, fontFamily: 'Cairo-Black', color: COLORS.primary },

  // Decline
  declineBtn:   { marginTop: 15, paddingHorizontal: 20, paddingVertical: 8 },
  declineLabel: { fontSize: 16, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary, opacity: 0.6 },
});

export default NewOrderCard;
