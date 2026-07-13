import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import OfflineBar from '../../../components/OfflineBar';

/**
 * BottomTabNavigator
 *
 * الإصلاح: React Native 0.81+ مع newArchEnabled يُفعِّل Edge-to-Edge تلقائياً
 * على Android، مما يجعل شريط التنقل السفلي للنظام شفافاً ويُخفي أزرار التابات
 * خلفه. الحل هو استخدام useSafeAreaInsets() لجعل الـ height والـ paddingBottom
 * ديناميكيين بدلاً من أرقام ثابتة.
 */
export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();

  // الارتفاع الأساسي للشريط (المحتوى المرئي) + مساحة أمان النظام السفلية
  const TAB_BASE_HEIGHT = 60;
  const tabBarHeight = TAB_BASE_HEIGHT + insets.bottom;

  // زر التاب مع haptic feedback
  const HapticTabButton = (props: any) => (
    <TouchableOpacity
      {...props}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPress?.(e);
      }}
    />
  );

  return (
    <>
      <OfflineBar />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTabButton,
        tabBarActiveTintColor: '#002147',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: {
          height: tabBarHeight,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F2F2F7',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          right: 0,
          left: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          flexDirection: 'row-reverse',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'الرئيسية',
          title: 'الرئيسية',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused && styles.activeIconContainer}>
              <Feather name="home" color={color} size={focused ? 26 : 24} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="promos"
        options={{
          tabBarLabel: 'العروض',
          title: 'العروض',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused && styles.activeIconContainer}>
              <Feather name="tag" color={color} size={focused ? 26 : 24} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="activities"
        options={{
          tabBarLabel: 'نشاطاتي',
          title: 'نشاطاتي',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused && styles.activeIconContainer}>
              <Feather name="clipboard" color={color} size={focused ? 26 : 24} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'حسابي',
          title: 'حسابي',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused && styles.activeIconContainer}>
              <Feather name="user" color={color} size={focused ? 26 : 24} />
            </View>
          ),
        }}
      />
    </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
    marginTop: 2,
  },
  activeIconContainer: {
    // placeholder for future active state styling
  },
});
