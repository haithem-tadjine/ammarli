import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const SKELETON_COLOR = '#E8ECF0';
const SHIMMER_COLOR = '#F5F7FA';

// ─── Generic Shimmer Row ───────────────────────────────────────────────────
const ShimmerBox = ({ style }: { style?: any }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Animated.View style={[{ backgroundColor: SKELETON_COLOR, borderRadius: 8, opacity }, style]} />
  );
};

// ─── Skeleton Card (for Activities / Order list) ───────────────────────────
export const SkeletonCard = () => (
  <View style={styles.card}>
    {/* Top row: icon + title + badge */}
    <View style={styles.cardHeaderRow}>
      <ShimmerBox style={styles.badge} />
      <View style={styles.cardTitleGroup}>
        <ShimmerBox style={styles.titleLine} />
        <ShimmerBox style={styles.subtitleLine} />
      </View>
      <ShimmerBox style={styles.iconBox} />
    </View>
    {/* Schedule banner */}
    <ShimmerBox style={styles.scheduleBanner} />
  </View>
);

// ─── Skeleton Notification Row ─────────────────────────────────────────────
export const SkeletonNotification = () => (
  <View style={styles.notifCard}>
    {/* Gold sideline */}
    <View style={styles.notifSideline} />
    <View style={styles.notifContent}>
      <View style={styles.notifTopRow}>
        <ShimmerBox style={styles.notifTime} />
        <ShimmerBox style={styles.notifDot} />
      </View>
      <View style={styles.notifBodyRow}>
        <View style={{ flex: 1 }}>
          <ShimmerBox style={styles.notifTitle} />
          <ShimmerBox style={styles.notifDesc} />
          <ShimmerBox style={{ ...styles.notifDesc, width: '55%' }} />
        </View>
        <ShimmerBox style={styles.notifIcon} />
      </View>
    </View>
  </View>
);

// ─── Skeleton List (repeats N times) ──────────────────────────────────────
interface SkeletonListProps {
  type: 'card' | 'notification';
  count?: number;
}

export const SkeletonList = ({ type, count = 3 }: SkeletonListProps) => (
  <>
    {Array.from({ length: count }).map((_, i) =>
      type === 'card' ? <SkeletonCard key={i} /> : <SkeletonNotification key={i} />
    )}
  </>
);

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Card skeleton
  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 18,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    marginLeft: 12,
  },
  cardTitleGroup: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  titleLine: {
    height: 14,
    width: '70%',
    borderRadius: 7,
    marginBottom: 8,
  },
  subtitleLine: {
    height: 10,
    width: '45%',
    borderRadius: 5,
  },
  badge: {
    width: 72,
    height: 28,
    borderRadius: 8,
  },
  scheduleBanner: {
    height: 44,
    borderRadius: 14,
    width: '100%',
  },

  // Notification skeleton
  notifCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    marginBottom: 16,
    flexDirection: 'row-reverse',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  notifSideline: {
    width: 5,
    backgroundColor: SKELETON_COLOR,
  },
  notifContent: {
    flex: 1,
    padding: 16,
  },
  notifTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notifTime: {
    height: 10,
    width: 55,
    borderRadius: 5,
  },
  notifDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  notifBodyRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
  },
  notifTitle: {
    height: 13,
    width: '80%',
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  notifDesc: {
    height: 10,
    width: '90%',
    borderRadius: 5,
    marginBottom: 6,
    alignSelf: 'flex-end',
  },
  notifIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginLeft: 12,
  },
});
