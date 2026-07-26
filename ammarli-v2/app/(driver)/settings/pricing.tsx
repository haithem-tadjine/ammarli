import React, { useState } from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDriverStore } from '../../../src/store/useDriverStore';
import { api } from '../../../src/services/api';

const COLORS = {
  primary: '#003366',
  secondary: '#F3CD0D',
  white: '#FFFFFF',
  background: '#F8FAFC',
  textSecondary: '#64748B',
  border: '#E2E8F0',
};

export default function PricingSettingsScreen() {
  const router = useRouter();
  const registeredDriver = useDriverStore((s: any) => s.registeredDriver);
  const [defaultPrice, setDefaultPrice] = useState(registeredDriver?.defaultPrice?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const isBottled = registeredDriver?.driverType === 'Bottled';
  const label = isBottled ? 'السعر الافتراضي للقارورة الواحدة (د.ج)' : 'سعر الدلو 20 L (د.ج)';
  const desc = isBottled 
    ? 'سيتم استخدام هذا السعر لحساب التكلفة الإجمالية تلقائياً (الكمية × سعر القارورة) وتخطي شاشة تسعير الطلبية.'
    : 'سيتم استخدام هذا السعر لحساب التكلفة الإجمالية تلقائياً (إجمالي اللترات ÷ 20 × سعر الدلو) وتخطي شاشة تسعير الطلبية.';

  const handleSave = async () => {
    const priceNum = parseFloat(defaultPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
      return;
    }

    setIsSaving(true);
    try {
      await api.patch('/drivers/me', { defaultPrice: priceNum });
      
      // Update local store
      useDriverStore.setState((s: any) => ({
        registeredDriver: s.registeredDriver ? {
          ...s.registeredDriver,
          defaultPrice: priceNum
        } : null
      }));

      Alert.alert('نجاح', 'تم حفظ السعر الافتراضي بنجاح', [
        { text: 'حسناً', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('خطأ', 'حدث مشكلة أثناء حفظ السعر. حاول مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer backgroundColor="#FFF" statusBarStyle="dark-content">
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>التسعير السريع (Fast Accept)</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <MaterialCommunityIcons name="cash-fast" size={50} color={COLORS.primary} style={styles.icon} />
        
        <Text style={styles.title}>تحديد السعر الافتراضي</Text>
        <Text style={styles.description}>{desc}</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={defaultPrice}
            onChangeText={setDefaultPrice}
            keyboardType="numeric"
            placeholder="مثال: 50"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.saveBtnText}>حفظ الإعدادات</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, height: 60, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, alignItems: 'center' },
  icon: { marginBottom: 20 },
  title: { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary, marginBottom: 10 },
  description: { fontSize: 14, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  inputContainer: { width: '100%', marginBottom: 30 },
  label: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary, marginBottom: 10, textAlign: 'left' },
  input: { width: '100%', height: 55, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 15, fontSize: 18, fontFamily: 'Cairo-Bold', textAlign: 'left', backgroundColor: COLORS.background },
  saveBtn: { width: '100%', height: 55, backgroundColor: COLORS.secondary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  saveBtnText: { fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary },
});
