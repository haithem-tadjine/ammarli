import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

/**
 * Ammarli Update Inventory Modal - React Native
 *
 * Features:
 * - Premium Modern Aesthetic (White spaces, soft shadows, 32px radius)
 * - Full Arabic RTL Support
 * - Interactive Brand Selection
 * - Typeable Quantity Fields (min: 0, max: 10,000) + Stepper Buttons
 * - Brand Colors: Navy (#003366) and Yellow (#F3CD0D)
 */

const MAX_QTY = 10000;
const MIN_QTY = 0;

const COLORS = {
  primary: '#003366',
  secondary: '#F3CD0D',
  white: '#FFFFFF',
  textSecondary: '#64748B',
  border: '#F1F5F9',
  background: 'rgba(0, 0, 0, 0.5)',
  errorLight: '#FEE2E2',
  error: '#EF4444',
};

type SizeKey = '0.5L' | '1.5L' | '5L';

interface Quantities {
  '0.5L': number;
  '1.5L': number;
  '5L': number;
}

interface UpdateInventoryModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── InventoryRow ───────────────────────────────────────────────────────────

interface InventoryRowProps {
  size: string;
  subLabel: string;
  value: number;
  onAdd: () => void;
  onRemove: () => void;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  inputValue: string;
}

const InventoryRow: React.FC<InventoryRowProps> = ({
  size,
  subLabel,
  value,
  onAdd,
  onRemove,
  onChangeText,
  onBlur,
  inputValue,
}) => {
  const isMax = value >= MAX_QTY;
  const isMin = value <= MIN_QTY;
  const isError = parseInt(inputValue, 10) > MAX_QTY;

  return (
    <View style={[styles.inventoryItem, isError && styles.inventoryItemError]}>
      {/* Stepper */}
      <View style={styles.stepperWrapper}>
        {/* + Button */}
        <TouchableOpacity
          style={[styles.plusBtn, isMax && styles.btnDisabled]}
          onPress={onAdd}
          disabled={isMax}
          activeOpacity={0.75}
        >
          <Ionicons name="add" size={20} color={isMax ? '#CBD5E1' : COLORS.primary} />
        </TouchableOpacity>

        {/* Editable Quantity */}
        <TextInput
          style={styles.qtyInput}
          value={inputValue}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType="number-pad"
          maxLength={5}
          selectTextOnFocus
          textAlign="center"
          returnKeyType="done"
        />

        {/* − Button */}
        <TouchableOpacity
          style={[styles.minusBtn, isMin && styles.btnDisabledMinus]}
          onPress={onRemove}
          disabled={isMin}
          activeOpacity={0.75}
        >
          <Ionicons name="remove" size={20} color={isMin ? '#CBD5E1' : COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Label */}
      <View style={styles.itemInfo}>
        <Text style={styles.sizeText}>{size}</Text>
        <Text style={styles.subText}>{subLabel}</Text>
        {isError && (
          <Text style={styles.errorText}>الحد الأقصى 10,000</Text>
        )}
      </View>

      {/* Icon */}
      <View style={styles.bottleIconContainer}>
        <MaterialCommunityIcons name="water" size={24} color={COLORS.primary} style={{ opacity: 0.6 }} />
      </View>
    </View>
  );
};

// ─── UpdateInventoryModal ────────────────────────────────────────────────────

const UpdateInventoryModal: React.FC<UpdateInventoryModalProps> = ({ visible, onClose }) => {
  const [selectedBrand, setSelectedBrand] = useState<string>('Ifri');

  // Numeric state (clamped)
  const [quantities, setQuantities] = useState<Quantities>({
    '0.5L': 12,
    '1.5L': 0,
    '5L': 0,
  });

  // Raw text state for TextInput (allows partial edits like "")
  const [inputTexts, setInputTexts] = useState<Record<SizeKey, string>>({
    '0.5L': '12',
    '1.5L': '0',
    '5L': '0',
  });

  const brands = [
    { id: 'Saida', name: 'Saida' },
    { id: 'Guedila', name: 'Guedila' },
    { id: 'Ifri', name: 'Ifri' },
  ];

  /** Clamp & sync after stepper button press */
  const handleStepQty = (size: SizeKey, delta: number) => {
    setQuantities(prev => {
      const next = Math.min(MAX_QTY, Math.max(MIN_QTY, prev[size] + delta));
      setInputTexts(t => ({ ...t, [size]: String(next) }));
      return { ...prev, [size]: next };
    });
  };

  /** Live update input text while typing */
  const handleTextChange = (size: SizeKey, text: string) => {
    // Only digits allowed
    const cleaned = text.replace(/[^0-9]/g, '');
    setInputTexts(prev => ({ ...prev, [size]: cleaned }));

    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(MAX_QTY, Math.max(MIN_QTY, parsed));
      setQuantities(prev => ({ ...prev, [size]: clamped }));
    }
  };

  /** On blur: sanitize empty / over-limit inputs */
  const handleBlur = (size: SizeKey) => {
    const raw = inputTexts[size];
    const parsed = parseInt(raw, 10);
    const safe = isNaN(parsed) ? MIN_QTY : Math.min(MAX_QTY, Math.max(MIN_QTY, parsed));
    setQuantities(prev => ({ ...prev, [size]: safe }));
    setInputTexts(prev => ({ ...prev, [size]: String(safe) }));
  };

  const handleSave = () => {
    // Flush any pending text first
    (['0.5L', '1.5L', '5L'] as SizeKey[]).forEach(k => handleBlur(k));
    console.log('Updating Stock:', { brand: selectedBrand, quantities });
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          {/* Pull Handle */}
          <View style={styles.pullHandle} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>تحديث المخزون</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Brand */}
            <Text style={styles.sectionLabel}>1. اختر العلامة التجارية</Text>
            <View style={styles.brandRow}>
              {brands.map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  style={[
                    styles.brandTile,
                    selectedBrand === brand.id && styles.brandTileActive,
                  ]}
                  onPress={() => setSelectedBrand(brand.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.brandInitial}>{brand.name.charAt(0)}</Text>
                  <Text style={styles.brandName}>{brand.name}</Text>
                  {selectedBrand === brand.id && <View style={styles.activeRing} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Step 2: Quantities */}
            <Text style={styles.sectionLabel}>2. أدخل الكميات</Text>
            <View style={styles.stepperContainer}>
              <InventoryRow
                size="0.5 لتر"
                subLabel="عبوات عادية"
                value={quantities['0.5L']}
                inputValue={inputTexts['0.5L']}
                onAdd={() => handleStepQty('0.5L', 1)}
                onRemove={() => handleStepQty('0.5L', -1)}
                onChangeText={(t) => handleTextChange('0.5L', t)}
                onBlur={() => handleBlur('0.5L')}
              />
              <InventoryRow
                size="1.5 لتر"
                subLabel="الحجم الأكثر طلباً"
                value={quantities['1.5L']}
                inputValue={inputTexts['1.5L']}
                onAdd={() => handleStepQty('1.5L', 1)}
                onRemove={() => handleStepQty('1.5L', -1)}
                onChangeText={(t) => handleTextChange('1.5L', t)}
                onBlur={() => handleBlur('1.5L')}
              />
              <InventoryRow
                size="5 لتر"
                subLabel="حجم كبير"
                value={quantities['5L']}
                inputValue={inputTexts['5L']}
                onAdd={() => handleStepQty('5L', 1)}
                onRemove={() => handleStepQty('5L', -1)}
                onChangeText={(t) => handleTextChange('5L', t)}
                onBlur={() => handleBlur('5L')}
              />
            </View>

            {/* Limit hint */}
            <Text style={styles.hintText}>الحد الأقصى للكمية: 10,000 | الحد الأدنى: 0</Text>
          </ScrollView>

          {/* Footer */}
          <SafeAreaView style={styles.footer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="sync"
                size={24}
                color={COLORS.primary}
                style={{ marginLeft: 10 }}
              />
              <Text style={styles.saveButtonText}>تحديث المخزون</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.88,
    paddingTop: 12,
  },
  pullHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'right',
    marginBottom: 16,
    opacity: 0.8,
  },
  // Brand
  brandRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginBottom: 32,
    paddingVertical: 10,
  },
  brandTile: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  brandTileActive: {
    borderWidth: 2.5,
    borderColor: COLORS.secondary,
  },
  brandInitial: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
  },
  brandName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeRing: {
    position: 'absolute',
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    opacity: 0.35,
  },
  // Inventory rows
  stepperContainer: {
    gap: 14,
  },
  inventoryItem: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inventoryItemError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  bottleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  sizeText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  subText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    fontWeight: '700',
    marginTop: 4,
  },
  // Stepper
  stepperWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 4,
  },
  qtyInput: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    marginHorizontal: 6,
    minWidth: 52,
    height: 44,
    paddingHorizontal: 4,
    textAlign: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.secondary,
  },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  minusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#E2E8F0',
    elevation: 0,
  },
  btnDisabledMinus: {
    opacity: 0.4,
  },
  hintText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 20,
    fontWeight: '600',
    opacity: 0.7,
  },
  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
    backgroundColor: COLORS.white,
  },
  saveButton: {
    height: 64,
    backgroundColor: COLORS.secondary,
    borderRadius: 32,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
});

export default UpdateInventoryModal;
