import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ScreenContainer, { MIN_BOTTOM_INSET } from '../../components/ScreenContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#002147',
  secondary: '#F3CD0D',
  white: '#FFFFFF',
  background: '#F8FAFC',
  textSecondary: '#64748B',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  border: '#E2E8F0',
};

export default function TripCancelledScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // في التطبيق الحقيقي، سيتم تمرير السبب من خلال الـ params أو الـ state
  const cancelReason = "وقت الانتظار طويل جداً";

  const handleReturnHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(driver)/(tabs)');
  };

  return (
    <ScreenContainer
      edges={['top']}
      backgroundColor={COLORS.dangerLight}
      statusBarStyle="dark-content"
    >
      <View style={styles.container}>
        
        {/* Header - Not really needed but good for spacing */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleReturnHome}>
            <Ionicons name="close" size={28} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="car-off" size={80} color={COLORS.danger} />
          </View>
          
          <Text style={styles.title}>تم إلغاء الرحلة</Text>
          <Text style={styles.subtitle}>قام الزبون بإلغاء الطلب. يمكنك الآن العودة لتلقي طلبات جديدة.</Text>

          <View style={styles.reasonCard}>
            <View style={styles.reasonHeader}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.reasonTitle}>سبب الإلغاء</Text>
            </View>
            <Text style={styles.reasonText}>&quot;{cancelReason}&quot;</Text>
          </View>
          
          {/* Illustration image (optional) */}
          <View style={styles.illustrationContainer}>
             <Image 
               source={{ uri: 'https://cdn-icons-png.flaticon.com/512/7500/7500305.png' }}
               style={styles.illustration}
               resizeMode="contain"
             />
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_INSET) + 20 }]}>
          <TouchableOpacity style={styles.returnButton} onPress={handleReturnHome}>
            <Text style={styles.returnButtonText}>العودة للرئيسية</Text>
          </TouchableOpacity>
        </View>
        
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dangerLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Cairo-Black',
    color: COLORS.danger,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  reasonCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  reasonTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
  },
  reasonText: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
    textAlign: 'left',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 30,
  },
  illustration: {
    width: 150,
    height: 150,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  returnButton: {
    width: '100%',
    height: 60,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  returnButtonText: {
    fontSize: 18,
    fontFamily: 'Cairo-Black',
    color: COLORS.white,
  },
});
