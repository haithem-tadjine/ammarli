import fs from 'fs';

const file = String.raw`o:\ammarli_prototype\ammarli-v2\app\(driver)\order-acceptance.tsx`;
let src = fs.readFileSync(file, 'utf8');

// Remove the useDriverAlert import
src = src.replace(`\nimport { useDriverAlert } from '../../src/hooks/useDriverAlert';`, '');

// Remove alertDismissed state + hook call
src = src.replace(
  `\n  const [alertDismissed, setAlertDismissed] = useState(false);\n  useDriverAlert(!alertDismissed); // fires vibration + in-app sound while screen is active`,
  ''
);

// Restore handleConfirm (remove setAlertDismissed(true))
src = src.replace(
  `    setAlertDismissed(true); // Stop sound + vibration immediately\r\n    setConfirmed(true);`,
  `    setConfirmed(true);`
);

// Restore handleCancel (remove setAlertDismissed lines, restore original "No" button)
src = src.replace(
  `    setAlertDismissed(true); // Stop sound + vibration before showing dialog\r\n    Alert.alert(`,
  `    Alert.alert(`
);
src = src.replace(
  `        { text: 'لا', style: 'cancel', onPress: () => setAlertDismissed(false) },`,
  `        { text: 'لا', style: 'cancel' },`
);

fs.writeFileSync(file, src, 'utf8');
console.log('✅ order-acceptance.tsx cleaned successfully');
