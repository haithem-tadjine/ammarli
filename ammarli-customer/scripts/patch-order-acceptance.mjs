import fs from 'fs';

const file = String.raw`o:\ammarli_prototype\ammarli-v2\app\(driver)\order-acceptance.tsx`;
let src = fs.readFileSync(file, 'utf8');

// Patch handleConfirm — add setAlertDismissed(true) after Haptics call
const confirmOld = `    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);\r\n    setConfirmed(true);`;
const confirmNew = `    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);\r\n    setAlertDismissed(true); // Stop sound + vibration immediately\r\n    setConfirmed(true);`;
if (src.includes(confirmOld)) {
  src = src.replace(confirmOld, confirmNew);
  console.log('✅ handleConfirm patched');
} else {
  console.error('❌ handleConfirm target not found');
}

// Patch handleCancel — add setAlertDismissed(true) before Alert and restore on "No"
const cancelOld = `  const handleCancel = () => {\r\n    Alert.alert(\r\n      'إلغاء الطلب',\r\n      'هل أنت متأكد من إلغاء هذا الطلب؟',\r\n      [\r\n        { text: 'لا', style: 'cancel' },\r\n        { text: 'نعم، إلغاء', style: 'destructive', onPress: () => router.replace('/(driver)/(tabs)' as any) },\r\n      ]\r\n    );\r\n  };`;
const cancelNew = `  const handleCancel = () => {\r\n    setAlertDismissed(true); // Stop sound + vibration before showing dialog\r\n    Alert.alert(\r\n      'إلغاء الطلب',\r\n      'هل أنت متأكد من إلغاء هذا الطلب؟',\r\n      [\r\n        { text: 'لا', style: 'cancel', onPress: () => setAlertDismissed(false) },\r\n        { text: 'نعم، إلغاء', style: 'destructive', onPress: () => router.replace('/(driver)/(tabs)' as any) },\r\n      ]\r\n    );\r\n  };`;
if (src.includes(cancelOld)) {
  src = src.replace(cancelOld, cancelNew);
  console.log('✅ handleCancel patched');
} else {
  console.error('❌ handleCancel target not found — checking arrow function variant');
  // Try with => arrow format in case of encoding difference
  const cancelOld2 = `  const handleCancel = () => {\r\n    Alert.alert(`;
  if (src.includes(cancelOld2)) {
    src = src.replace(cancelOld2, `  const handleCancel = () => {\r\n    setAlertDismissed(true);\r\n    Alert.alert(`);
    console.log('✅ handleCancel patched (variant)');
  } else {
    console.error('❌ handleCancel variant also not found');
  }
}

fs.writeFileSync(file, src, 'utf8');
console.log('✅ Done writing file');
