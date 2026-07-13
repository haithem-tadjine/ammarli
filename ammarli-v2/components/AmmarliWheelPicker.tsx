import React, { useState, useRef, useEffect, memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';

const { width, height } = Dimensions.get('window');

// إعدادات القياسات لضمان دقة "الالتصاق" عند السحب
const ITEM_HEIGHT = 45; // ارتفاع كل نص في القائمة
const VISIBLE_ITEMS = 5; // عدد العناصر الظاهرة في العمود
const THEME_NAVY = '#012047';

// ─── مكون العمود التفاعلي المفصول لتجنب إعادة البناء (Re-rendering Jitter) ───
const PickerColumn = memo(({ data, label, flex = 1, selectedValue, onValueChange, visible }: any) => {
  const paddedData = ['', '', ...data, '', ''];
  const flatListRef = useRef<FlatList>(null);
  const lastIndex = useRef(data.indexOf(selectedValue));

  // عند الفتح، نضع الـ Scroll على العنصر المختار مسبقاً
  useEffect(() => {
    if (visible) {
      const index = data.indexOf(selectedValue);
      if (index !== -1 && flatListRef.current) {
        lastIndex.current = index;
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
        }, 50);
      }
    }
  }, [visible]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    // إضافة حماية للقيم السالبة أو الكبيرة جداً
    const index = Math.max(0, Math.min(data.length - 1, Math.round(y / ITEM_HEIGHT)));
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      onValueChange(data[index]);
    }
  };

  return (
    <View style={[styles.columnWrapper, { flex }]}>
      <Text style={styles.columnLabel}>{label}</Text>
      <FlatList
        ref={flatListRef}
        data={paddedData}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <Text style={[styles.itemText, item === '' && { opacity: 0 }]}>
              {item}
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
});
PickerColumn.displayName = 'PickerColumn';

const DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
const MONTHS = ['أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'جانفي', 'فيفري', 'مارس'];
const YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];
const HOUR_NUMBERS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const PERIODS = ['ص', 'م'];

const AmmarliWheelPicker = ({ visible, onClose, onConfirm, initialDate, initialTime }: any) => {

  const [selectedDay, setSelectedDay] = useState(DAYS[16]);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [selectedYear, setSelectedYear] = useState(YEARS[1]);
  
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('12');
  const [selectedPeriod, setSelectedPeriod] = useState('م');

  // استخراج القيم من initialDate و initialTime عند فتح النافذة
  useEffect(() => {
    if (visible) {
      if (initialDate) {
        const parts = initialDate.split(' ');
        if (parts.length >= 3) {
          if (DAYS.includes(parts[0])) setSelectedDay(parts[0]);
          if (MONTHS.includes(parts[1])) setSelectedMonth(parts[1]);
          if (YEARS.includes(parts[2])) setSelectedYear(parts[2]);
        }
      }
      if (initialTime) {
        const timeParts = initialTime.split(' '); // ["08:12", "م"]
        if (timeParts.length === 2) {
          const hm = timeParts[0].split(':'); // ["08", "12"]
          if (hm.length === 2) {
            if (HOUR_NUMBERS.includes(hm[0])) setSelectedHour(hm[0]);
            if (MINUTES.includes(hm[1])) setSelectedMinute(hm[1]);
          }
          if (PERIODS.includes(timeParts[1])) setSelectedPeriod(timeParts[1]);
        }
      }
    }
  }, [visible, initialDate, initialTime]);

  const handleConfirm = () => {
    const formattedDate = `${selectedDay} ${selectedMonth} ${selectedYear}`;
    const formattedTime = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    onConfirm(formattedDate, formattedTime);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.pickerContainer}>
          
          {/* شريط التحكم العلوي */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7}>
              <Text style={styles.doneText}>تم</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>

          {/* خلفية التحديد المركزية (الخيار المختار) */}
          <View style={styles.selectionOverlay} pointerEvents="none" />

          {/* حاوية الأعمدة - ترتيب RTL من اليمين لليسار */}
          <View style={styles.columnsContainer}>
            <PickerColumn visible={visible} data={DAYS} label="اليوم" flex={1.3} selectedValue={selectedDay} onValueChange={setSelectedDay} />
            <PickerColumn visible={visible} data={MONTHS} label="الشهر" flex={1} selectedValue={selectedMonth} onValueChange={setSelectedMonth} />
            <PickerColumn visible={visible} data={YEARS} label="السنة" flex={1} selectedValue={selectedYear} onValueChange={setSelectedYear} />
            
            <View style={styles.verticalDivider} />
            
            <PickerColumn visible={visible} data={HOUR_NUMBERS} label="الساعة" flex={0.8} selectedValue={selectedHour} onValueChange={setSelectedHour} />
            <Text style={styles.colon}>:</Text>
            <PickerColumn visible={visible} data={MINUTES} label="دقائق" flex={0.8} selectedValue={selectedMinute} onValueChange={setSelectedMinute} />
            <PickerColumn visible={visible} data={PERIODS} label="الفترة" flex={0.7} selectedValue={selectedPeriod} onValueChange={setSelectedPeriod} />
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: ITEM_HEIGHT * VISIBLE_ITEMS + 110,
    paddingBottom: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  doneText: {
    color: THEME_NAVY,
    fontSize: 19,
    fontFamily: 'Cairo-Bold',
  },
  cancelText: {
    color: '#E63946',
    fontSize: 17,
    fontFamily: 'Cairo-SemiBold',
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row-reverse',
    paddingHorizontal: 10,
  },
  columnWrapper: {
    height: '100%',
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'Cairo-Bold',
    marginTop: 10,
    marginBottom: 5,
  },
  itemWrapper: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  itemText: {
    fontSize: 16,
    color: THEME_NAVY,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
  },
  selectionOverlay: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2 + 33,
    left: 10,
    right: 10,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(1, 32, 71, 0.04)',
    borderRadius: 10,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#E5E5EA',
    zIndex: -1,
  },
  verticalDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginHorizontal: 4,
    marginTop: 35,
  },
  colon: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    marginTop: ITEM_HEIGHT * 2 + 42,
    marginHorizontal: 2,
  },
});

export default AmmarliWheelPicker;
