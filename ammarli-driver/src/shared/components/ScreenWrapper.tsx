/**
 * ─── ScreenWrapper ─────────────────────────────────────────────────────────────
 * Standard full-screen container with safe area + background color.
 * Use this as the root wrapper in every screen.
 *
 * @example
 * <ScreenWrapper>
 *   <YourContent />
 * </ScreenWrapper>
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export default function ScreenWrapper({
  children,
  style,
  backgroundColor = COLORS.bgLight,
  edges = ['top', 'bottom'],
}: ScreenWrapperProps) {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }, style]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
