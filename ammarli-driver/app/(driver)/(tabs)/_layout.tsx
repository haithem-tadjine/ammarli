import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#003366', // Deep Navy Blue
  secondary: '#F3CD0D', // Vibrant Yellow
  white: '#FFFFFF',
  textSecondary: '#64748B',
};

// Map route names to tab properties
const TAB_DATA: Record<string, any> = {
  index: { label: 'الرئيسية', icon: 'home-outline', library: 'MaterialCommunityIcons' },
  trips: { label: 'الرحلات', icon: 'truck-outline', library: 'MaterialCommunityIcons' },
  wallet: { label: 'الأرباح', icon: 'wallet-outline', library: 'MaterialCommunityIcons' },
  profile: { label: 'الملف الشخصي', icon: 'user', library: 'Feather' },
};

function AmmarliBottomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 25 : 10, height: 90 + (insets.bottom > 0 ? insets.bottom / 2 : 0) }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tabInfo = TAB_DATA[route.name];

        if (!tabInfo) return null;

        const IconComponent = tabInfo.library === 'Feather' ? Feather : MaterialCommunityIcons;

        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity 
            key={route.name}
            style={[styles.tabItem, isFocused && styles.tabItemActive]}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <IconComponent 
              name={isFocused && tabInfo.icon.includes('-outline') ? tabInfo.icon.replace('-outline', '') : tabInfo.icon} 
              size={24} 
              color={isFocused ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tabInfo.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function DriverTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <AmmarliBottomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 90,
    backgroundColor: COLORS.white,
    flexDirection: 'row', // RTL Support
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderTopRightRadius: 35,
    borderTopLeftRadius: 35,
    // Premium Uber Style Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 25,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width / 4.5,
    height: 60,
  },
  tabItemActive: {
    backgroundColor: COLORS.secondary,
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 12,
    // Active Tab Glow/Shadow
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Cairo-Bold',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontFamily: 'Cairo-Black',
    marginTop: 2,
  },
});
