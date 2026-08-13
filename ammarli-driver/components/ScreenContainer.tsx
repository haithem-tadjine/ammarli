/**
 * ──────────────────────────────────────────────────────────────────────────────
 * ScreenContainer — الحاوية الموحدة للمساحة الآمنة في تطبيق عمارلي
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * تحل هذه الحاوية الثغرات الخمس التالية:
 *
 *  ①  تستبدل `SafeAreaView` من `react-native` الذي يعتمد على
 *     `StatusBar.currentHeight` (غير موثوق في Edge-to-Edge على Android 14+).
 *
 *  ②  تمنع الازدواجية (Double Inset) التي تحدث عند الجمع بين SafeAreaView
 *     و `paddingTop: insets.top` اليدوي في نفس الشاشة.
 *
 *  ③  تُطبّق `MIN_BOTTOM_INSET` كـ Fallback يضمن وجود 16dp حداً أدنى
 *     حتى لو أرجع النظام `insets.bottom = 0` في أول Render على بعض
 *     أجهزة Android مع `newArchEnabled: true`.
 *
 *  ④  تعمل بشكل صحيح مع Edge-to-Edge المُفعَّل تلقائياً على Android 15+.
 *
 *  ⑤  تُصدِّر ثوابت مشتركة (TAB_BAR_HEIGHT, MIN_BOTTOM_INSET) لتوحيد
 *     حسابات `paddingBottom` في جميع الـ ScrollViews عبر التطبيق.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * الاستخدام:
 *
 *  // شاشة عادية (أعلى فقط — الأكثر شيوعاً)
 *  <ScreenContainer>...</ScreenContainer>
 *
 *  // شاشة تحتاج حماية أعلى وأسفل (بدون Footer مطلق)
 *  <ScreenContainer edges={['top', 'bottom']}>...</ScreenContainer>
 *
 *  // شاشة ذات هيدر ملوّن (مثل order-details)
 *  <ScreenContainer statusBarStyle="light-content" statusBarColor="#003366">
 *    ...
 *  </ScreenContainer>
 * ──────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  StatusBar,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, Edge } from 'react-native-safe-area-context';

// ─── الثوابت المُصدَّرة ────────────────────────────────────────────────────────

export const MIN_BOTTOM_INSET = 16;
export const TAB_BAR_HEIGHT = 60;

// ─── الأنواع ────────────────────────────────────────────────────────────────

type SafeEdge = 'top' | 'bottom' | 'left' | 'right';

interface ScreenContainerProps {
  children?: React.ReactNode;
  edges?: SafeEdge[];
  backgroundColor?: string;
  statusBarStyle?: 'dark-content' | 'light-content' | 'default';
  statusBarColor?: string;
  style?: StyleProp<ViewStyle>;
}

// ─── المكوّن الرئيسي ───────────────────────────────────────────────────────

export default function ScreenContainer({
  children,
  edges = ['top'],
  backgroundColor = '#FFFFFF',
  statusBarStyle = 'dark-content',
  statusBarColor,
  style,
}: ScreenContainerProps) {
  // Use useSafeAreaInsets only if we need manual fallback padding, but
  // SafeAreaView handles the edges natively. We will apply MIN_BOTTOM_INSET
  // manually to the style if bottom edge is requested.
  const insets = useSafeAreaInsets();
  
  // SafeAreaView will handle the insets automatically based on `edges` prop.
  // But we want to enforce MIN_BOTTOM_INSET if 'bottom' is included.
  const hasBottomEdge = edges.includes('bottom');
  const extraBottomPadding = hasBottomEdge && insets.bottom < MIN_BOTTOM_INSET ? MIN_BOTTOM_INSET - insets.bottom : 0;

  return (
    <SafeAreaView
      edges={edges as Edge[]}
      style={[
        styles.base,
        { backgroundColor },
        hasBottomEdge && { paddingBottom: extraBottomPadding },
        style,
      ]}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor ?? backgroundColor}
        translucent={Platform.OS === 'android'}
      />
      {children}
    </SafeAreaView>
  );
}

// ─── الـ Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
