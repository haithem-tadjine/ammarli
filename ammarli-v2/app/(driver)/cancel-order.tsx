import ScreenContainer from '../../components/ScreenContainer';
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  XCircle 
} from 'lucide-react-native';
import { useDriverStore } from '../../src/store/useDriverStore';

const THEME_NAVY = '#002147';
const THEME_YELLOW = '#F3CD0D';

export default function CancelOrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cancelDriverOrder = useDriverStore((s) => s.cancelDriverOrder);
  
  const [selectedReason, setSelectedReason] = useState<number | null>(null);

  const reasons = [
    { id: 1, text: 'الزبون لا يرد', icon: <XCircle color={THEME_NAVY} size={26} strokeWidth={1.5} /> },
    { id: 2, text: 'عنوان خاطئ', icon: <AlertCircle color={THEME_NAVY} size={26} strokeWidth={1.5} /> },
    { id: 3, text: 'عطل في المركبة', icon: <XCircle color={THEME_NAVY} size={26} strokeWidth={1.5} /> },
    { id: 4, text: 'وقت الانتظار طويل جداً', icon: <Clock color={THEME_NAVY} size={26} strokeWidth={1.5} /> },
  ];

  const handleSelectReason = (id: number) => {
    setSelectedReason(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCancel = () => {
    if (!selectedReason) {
      Alert.alert('تنبيه', 'يرجى اختيار سبب الإلغاء');
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const finalReason = reasons.find(r => r.id === selectedReason)?.text || 'غير معروف';

    cancelDriverOrder(finalReason);
    router.replace('/(driver)/(tabs)' as any);
  };

  return (
    <ScreenContainer style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDFDFD" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={{ width: 44 }} />
        <Text style={styles.headerTitle}>إلغاء الطلب</Text>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.6} onPress={() => router.back()}>
          <ChevronRight color={THEME_NAVY} size={32} />
        </TouchableOpacity>
      </View>

      {/* محتوى الأسباب القابل للتمرير */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.mainHeading}>لماذا تود الإلغاء؟</Text>

        {/* قائمة البطاقات التفاعلية */}
        <View style={styles.cardsContainer}>
          {reasons.map((item) => {
            const isSelected = selectedReason === item.id;
            return (
              <TouchableOpacity 
                key={item.id}
                style={[styles.reasonCard, isSelected && styles.selectedCard]}
                activeOpacity={0.8}
                onPress={() => handleSelectReason(item.id)}
              >
                {/* Icon on the right, text centered/left in remaining space */}
                <View style={[styles.iconWrapper, isSelected && styles.selectedIconWrapper]}>
                   {item.icon}
                </View>
                <Text style={[styles.cardText, isSelected && styles.selectedCardText]}>{item.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* الفوترة السفلية المرنة والمحمية بالـ Insets */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 15) }]}>
        <TouchableOpacity 
          style={[styles.cancelButton, !selectedReason && styles.disabledButton]} 
          onPress={handleCancel}
          disabled={!selectedReason}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>إلغاء الطلب</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.returnButton} activeOpacity={0.6} onPress={() => router.back()}>
          <Text style={styles.returnButtonText}>العودة للطلب</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFDFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 160, 
  },
  mainHeading: {
    fontSize: 26,
    fontFamily: 'Cairo-Black',
    color: THEME_NAVY,
    textAlign: 'left',
    marginBottom: 30,
  },
  cardsContainer: {
    width: '100%',
  },
  reasonCard: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: THEME_NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  selectedCard: {
    borderColor: THEME_YELLOW,
    backgroundColor: '#FFFBEB',
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: THEME_NAVY,
    textAlign: 'center',
    marginLeft: 15,
  },
  selectedCardText: {
    fontFamily: 'Cairo-Bold',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIconWrapper: {
    backgroundColor: '#FFF',
  },
  footer: {
    paddingHorizontal: 25,
    backgroundColor: '#FDFDFD',
    paddingTop: 10,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  cancelButton: {
    backgroundColor: THEME_YELLOW,
    width: '100%',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: THEME_YELLOW,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  disabledButton: {
    backgroundColor: '#E5E5EA',
    shadowOpacity: 0,
    elevation: 0,
  },
  cancelButtonText: {
    fontSize: 18,
    fontFamily: 'Cairo-Black',
    color: THEME_NAVY,
  },
  returnButton: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  returnButtonText: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
  },
});
