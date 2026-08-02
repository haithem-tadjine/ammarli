import React, { useState } from 'react';
import ScreenContainer from '../../../components/ScreenContainer';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

  return (
    <ScreenContainer backgroundColor="#FFF" statusBarStyle="dark-content">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>التسعير السريع (Fast Accept)</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* أيقونة + وصف */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="cash-fast" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>تحديد الأسعار الافتراضية</Text>
          <Text style={styles.description}>
            {isBottled
              ? 'عند وصول طلبية، سيحسب التطبيق السعر تلقائياً بناءً على حجم القارورة والكمية المطلوبة — دون الحاجة لإدخال السعر في كل مرة.'
              : 'سيتم استخدام سعر الدلو لحساب التكلفة الإجمالية تلقائياً (إجمالي اللترات ÷ 20 × سعر الدلو) وتخطي شاشة تسعير الطلبية.'}
          </Text>
        </View>

        {isBottled ? (
          /* ── حقول القوارير الثلاثة ── */
          <View style={styles.card}>
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
            <View style={styles.exampleBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.exampleText}>
                مثال: طلب 3 فاردو 1.5L = 3 × {price15 || '---'} = {price15 ? (3 * parseFloat(price15) || 0).toLocaleString('ar-DZ') : '---'} د.ج
              </Text>
            </View>
          </View>
        ) : (
          /* ── حقل الينابيع ── */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>سعر الدلو (20 لتر)</Text>
            <PriceField
              label="سعر الدلو 20L (د.ج)"
              hint="سعر الوحدة الأساسية"
              value={defaultPrice}
              onChange={setDefaultPrice}
            />
            <View style={styles.exampleBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.exampleText}>
                مثال: طلب 1000 لتر = 50 دلو × {defaultPrice || '---'} = {defaultPrice ? ((1000 / 20) * (parseFloat(defaultPrice) || 0)).toLocaleString('ar-DZ') : '---'} د.ج
              </Text>
            </View>
          </View>
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
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, height: 60,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo-Black', color: COLORS.primary },
  backBtn:     { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  scroll: { padding: 20 },

  heroSection: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title:       { fontSize: 20, fontFamily: 'Cairo-Black', color: COLORS.primary, marginBottom: 8 },
  description: {
    fontSize: 13, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },

  card: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 20,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16, fontFamily: 'Cairo-Black', color: COLORS.primary,
    marginBottom: 20, textAlign: 'left',
  },

  fieldContainer: { marginBottom: 6 },
  fieldHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel:     { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.primary },
  fieldHint:      { fontSize: 11, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 15, height: 56,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1, fontSize: 20, fontFamily: 'Cairo-Black',
    color: COLORS.primary, textAlign: 'right',
  },
  currency: { fontSize: 14, fontFamily: 'Cairo-Bold', color: COLORS.textSecondary, marginLeft: 8 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },

  exampleBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12,
    marginTop: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  exampleText: { flex: 1, fontSize: 12, fontFamily: 'Cairo-SemiBold', color: COLORS.textSecondary, lineHeight: 20 },

  saveBtn: {
    height: 60, backgroundColor: COLORS.secondary, borderRadius: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, elevation: 4,
  },
  saveBtnText: { fontSize: 17, fontFamily: 'Cairo-Black', color: COLORS.primary },
});
