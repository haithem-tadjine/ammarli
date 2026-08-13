import fs from 'fs';

const file = String.raw`o:\ammarli_prototype\ammarli-v2\app\(driver)\(tabs)\index.tsx`;
let src = fs.readFileSync(file, 'utf8');

// 1. Add import after the last existing import line
const importTarget = `import UpdateInventoryModal from '../../../components/UpdateInventoryModal';`;
const importReplacement = `import UpdateInventoryModal from '../../../components/UpdateInventoryModal';\r\nimport { useDriverAlert } from '../../../src/hooks/useDriverAlert';`;

if (src.includes(importTarget)) {
  src = src.replace(importTarget, importReplacement);
  console.log('✅ import added');
} else {
  console.error('❌ import target not found');
}

// 2. Add useDriverAlert(showOrder) call right after the showOrder state declaration
const hookTarget = `  const [showOrder, setShowOrder] = useState(false);`;
const hookReplacement = `  const [showOrder, setShowOrder] = useState(false);\r\n\r\n  // تشغيل صوت تنبيه + اهتزاز متكرر طوال مدة ظهور بطاقة الطلبية\r\n  useDriverAlert(showOrder);`;

if (src.includes(hookTarget)) {
  src = src.replace(hookTarget, hookReplacement);
  console.log('✅ useDriverAlert(showOrder) added');
} else {
  console.error('❌ showOrder state target not found');
}

fs.writeFileSync(file, src, 'utf8');
console.log('✅ index.tsx patched successfully');
