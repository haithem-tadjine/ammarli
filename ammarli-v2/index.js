import { I18nManager } from 'react-native';

// Force RTL layout on the Native Bridge BEFORE the app initializes
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Continue with standard Expo Router initialization
import 'expo-router/entry';
