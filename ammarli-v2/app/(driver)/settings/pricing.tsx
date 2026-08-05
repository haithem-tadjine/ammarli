import React, { useState } from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView, StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useDriverStore } from '../../../src/store/useDriverStore';
import { api } from '../../../src/services/api';

const COLORS = {
  primary:       '#003366',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  background:    '#F8FAFC',
  textSecondary: '#64748B',
  border:        '#E2E8F0',
  success:       '#22C55E',
};

// ── مكوّن حقل السعر ──────────────────────────────────────────────────────────
function PriceField({
  label, hint, value, onChange,
}: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldHint}>{hint}</Text>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.currency}>د.ج</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#94A3B8"
          textAlign="right"
        />
      </View>
    </View>
  );
}

// ── الشاشة الرئيسية ───────────────────────────────────────────────────────────
export default function PricingSettingsScreen() {
  const router = useRouter();
  const registeredDriver = useDriverStore((s: any) => s.registeredDriver);

  const isBottled = registeredDriver?.driverType === 'Bottled';

  // ── حالة سائق الينابيع (حقل واحد) ─────────────────────────────────────────
  const [defaultPrice, setDefaultPrice] = useState(
    registeredDriver?.defaultPrice?.toString() || ''
  );

  // ── حالة سائق القوارير (ثلاثة حقول) ────────────────────────────────────────
  const [price05, setPrice05] = useState(
    registeredDriver?.bottledPrices?.['0.5L']?.toString() || ''
  );
  const [price15, setPrice15] = useState(
    registeredDriver?.bottledPrices?.['1.5L']?.toString() || ''
  );
  const [price5, setPrice5] = useState(
    registeredDriver?.bottledPrices?.['5L']?.toString() || ''
  );

  const [isSaving, setIsSaving] = useState(false);

  // ── حفظ ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isBottled) {
        // ── قوارير: التحقق من الحقول الثلاثة ──
        const p05 = parseFloat(price05);
        const p15 = parseFloat(price15);
        const p5  = parseFloat(price5);

        if ([p05, p15, p5].some((v) => isNaN(v) || v <= 0)) {
          Alert.alert('خطأ', 'يرجى إدخال سعر صحيح لجميع الأحجام');
          return;
        }

        const bottledPrices = { '0.5L': p05, '1.5L': p15, '5L': p5 };
        await api.patch('/drivers/me', { bottledPrices });

        useDriverStore.setState((s: any) => ({
          registeredDriver: s.registeredDriver
            ? { ...s.registeredDriver, bottledPrices }
            : null,
        }));
      } else {
        // ── ينابيع: حقل واحد ──
        const priceNum = parseFloat(defaultPrice);
        if (isNaN(priceNum) || priceNum <= 0) {
          Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
          return;
        }

        await api.patch('/drivers/me', { defaultPrice: priceNum });

        useDriverStore.setState((s: any) => ({
          registeredDriver: s.registeredDriver
            ? { ...s.registeredDriver, defaultPrice: priceNum }
            : null,
        }));
      }

      Alert.alert('نجاح', 'تم حفظ الأسعار الافتراضية بنجاح', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('خطأ', 'حدث مشكلة أثناء حفظ الأسعار. حاول مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  const isOnline = useDriverStore((s: any) => s.isOnline);
  const bgColors = isOnline ? (['#F8FAFC', '#E2E8F0'] as const) : (['#F1F5F9', '#CBD5E1'] as const);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BlurView intensity={50} tint="light" style={styles.iconWrap}>
            <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.primary} />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>التسعير السريع (Fast Accept)</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* أيقونة + وصف */}
        <View style={styles.heroSection}>
          <BlurView intensity={50} tint="light" style={styles.iconCircle}>
            <MaterialCommunityIcons name="cash-fast" size={40} color={COLORS.primary} />
          </BlurView>
          <Text style={styles.title}>تحديد الأسعار الافتراضية</Text>
          <Text style={styles.description}>
            {isBottled
              ? 'عند وصول طلبية، سيحسب التطبيق السعر تلقائياً بناءً على حجم القارورة والكمية المطلوبة — دون الحاجة لإدخال السعر في كل مرة.'
              : 'سيتم استخدام سعر الدلو لحساب التكلفة الإجمالية تلقائياً (إجمالي اللترات ÷ 20 × سعر الدلو) وتخطي شاشة تسعير الطلبية.'}
          </Text>
        </View>

        {isBottled ? (
          /* ── حقول القوارير الثلاثة ── */
          <BlurView intensity={70} tint="light" style={styles.card}>
            <Text style={styles.cardTitle}>أسعار الفارداو والقوارير</Text>

            <PriceField
              label="فاردو نصف لتر (0.5L)"
              hint="سعر الفاردو كاملاً"
              value={price05}
              onChange={setPrice05}
            />
            <View style={styles.divider} />

            <PriceField
              label="فاردو لتر ونصف (1.5L)"
              hint="سعر الفاردو كاملاً"
              value={price15}
              onChange={setPrice15}
            />
            <View style={styles.divider} />

            <PriceField
              label="قارورة خمس لترات (5L)"
              hint="سعر القارورة الواحدة"
              value={price5}
              onChange={setPrice5}
            />

            {/* مثال توضيحي */}
            <BlurView intensity={40} tint="light" style={styles.exampleBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.exampleText}>
                مثال: طلب 3 فاردو 1.5L = 3 × {price15 || '---'} = {price15 ? (3 * parseFloat(price15) || 0).toLocaleString('ar-DZ') : '---'} د.ج
              </Text>
            </BlurView>
          </BlurView>
        ) : (
          /* ── حقل الينابيع ── */
          <BlurView intensity={70} tint="light" style={styles.card}>
            <Text style={styles.cardTitle}>سعر الدلو (20 لتر)</Text>
            <PriceField
              label="سعر الدلو 20L (د.ج)"
              hint="سعر الوحدة الأساسية"
              value={defaultPrice}
              onChange={setDefaultPrice}
            />
            <BlurView intensity={40} tint="light" style={styles.exampleBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.exampleText}>
                مثال: طلب 1000 لتر = 50 دلو × {defaultPrice || '---'} = {defaultPrice ? ((1000 / 20) * (parseFloat(defaultPrice) || 0)).toLocaleString('ar-DZ') : '---'} د.ج
              </Text>
            </BlurView>
          </BlurView>
        )}

        {/* زر الحفظ */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save-check" size={22} color={COLORS.primary} />
              <Text style={styles.saveBtnText}>حفظ الإعدادات</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 40, paddingBottom: 15,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Cairo-Black', color: COLORS.primary },
  backBtn:     { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },

  scroll: { padding: 20 },

  heroSection: { alignItems: 'center', marginBottom: 28, marginTop: 10 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
  },
  title:       { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary, marginBottom: 8 },
  description: {
    fontSize: 13, fontFamily: 'Cairo-SemiBold', color: '#64748B',
    textAlign: 'center', lineHeight: 22,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary,
    marginBottom: 20, textAlign: 'left',
  },

  fieldContainer: { marginBottom: 6 },
  fieldHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel:     { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  fieldHint:      { fontSize: 11, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16, paddingHorizontal: 15, height: 56,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  input: {
    flex: 1, fontSize: 20, fontFamily: 'Cairo-Black',
    color: COLORS.primary, textAlign: 'right',
  },
  currency: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary, marginLeft: 8 },

  divider: { height: 1, backgroundColor: 'rgba(0,33,71,0.06)', marginVertical: 16 },

  exampleBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  exampleText: { flex: 1, fontSize: 12, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary, lineHeight: 20 },

  saveBtn: {
    height: 60, backgroundColor: COLORS.secondary, borderRadius: 20,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, elevation: 4, shadowColor: COLORS.secondary, shadowOpacity: 0.3, shadowRadius: 10,
  },
  saveBtnText: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
});
