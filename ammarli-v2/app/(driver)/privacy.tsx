import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const THEME_NAVY = '#003366';
const THEME_YELLOW = '#F3CD0D';

// URL الرسمي لسياسة الخصوصية
const PRIVACY_POLICY_URL = 'https://haithemtadjine.github.io/amerli-/privacy-policy.html';

// Fallback: HTML مضمّن في حالة عدم الاتصال
const FALLBACK_HTML = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Cairo',sans-serif; background:#f4f7f6; color:#1a2740; padding:20px; direction:rtl; }
    h2 { color:#003366; font-size:1.1rem; margin-bottom:8px; }
    .card { background:#fff; border-radius:16px; padding:20px; margin-bottom:16px;
            box-shadow:0 4px 20px rgba(0,51,102,0.1); border-right:4px solid #F3CD0D; }
    p, li { color:#5a6e8a; font-size:0.95rem; line-height:1.8; }
    ul { padding-right:20px; margin-top:8px; }
    li { margin-bottom:6px; }
    .title { font-size:1.4rem; font-weight:800; color:#003366; text-align:center; margin-bottom:20px; }
    .date { text-align:center; color:#F3CD0D; background:#003366; padding:6px 16px;
            border-radius:50px; display:inline-block; font-size:0.8rem; font-weight:600; margin-bottom:20px; }
    .center { text-align:center; }
    strong { color:#003366; }
    .section-en { direction:ltr; text-align:left; margin-top:30px; }
    .sep { border:none; border-top:2px dashed #e0e0e0; margin:30px 0; }
    .email { color:#003366; font-weight:700; }
  </style>
</head>
<body>
  <div class="title">سياسة الخصوصية — عمارلي</div>
  <div class="center"><span class="date">📅 آخر تحديث: 17 أوت 2026</span></div>
  <br/>
  <div class="card">
    <h2>1. المعلومات التي نجمعها</h2>
    <ul>
      <li>الاسم ورقم الهاتف</li>
      <li>بيانات الموقع الجغرافي (GPS)</li>
      <li><strong>تطبيق الزبون:</strong> الموقع الدقيق لتحديد مكان التوصيل</li>
      <li><strong>تطبيق السائق:</strong> الموقع في الخلفية (Background Location) لتتبع مسار الصهريج</li>
    </ul>
  </div>
  <div class="card">
    <h2>2. كيف نستخدم معلوماتك</h2>
    <ul>
      <li>تسهيل طلبات توصيل المياه</li>
      <li>ربط الزبائن بالسائقين</li>
      <li>منع الاحتيال</li>
    </ul>
  </div>
  <div class="card">
    <h2>3. مشاركة المعلومات</h2>
    <p>لا نبيع بياناتك. نشارك فقط اسم وموقع الزبون مع السائق المعين.</p>
  </div>
  <div class="card">
    <h2>4. أمان البيانات</h2>
    <p>نستخدم تشفيراً قوياً لحماية بياناتك.</p>
  </div>
  <div class="card">
    <h2>5. حذف الحساب والبيانات</h2>
    <p>يحق لك طلب حذف حسابك وبياناتك نهائياً عبر زر "حذف الحساب" داخل التطبيق أو بمراسلتنا.</p>
    <p><strong>⏱️ سيتم الحذف خلال 14 يوماً.</strong></p>
  </div>
  <div class="card">
    <h2>6. الاتصال بنا</h2>
    <p class="email">📧 haithemtadjine27@gmail.com</p>
  </div>
  <hr class="sep"/>
  <div class="section-en">
    <div class="title" style="font-size:1.2rem">Privacy Policy — Ammarli</div>
    <div class="card">
      <h2>1. Information We Collect</h2>
      <ul>
        <li>Name and phone number</li>
        <li>Location Data (GPS)</li>
        <li><strong>Customer App:</strong> Precise location for delivery destination</li>
        <li><strong>Driver App:</strong> Background location to track water tanks</li>
      </ul>
    </div>
    <div class="card">
      <h2>5. Account and Data Deletion</h2>
      <p>You may request full deletion via the app or by emailing us. Data deleted within <strong>14 days</strong>.</p>
    </div>
    <div class="card">
      <h2>6. Contact Us</h2>
      <p class="email">📧 haithemtadjine27@gmail.com</p>
    </div>
  </div>
</body>
</html>
`;

const DriverPrivacyPolicyScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_NAVY} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronRight color={THEME_YELLOW} size={30} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>سياسة الخصوصية</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* WebView */}
      <View style={styles.webviewContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={THEME_NAVY} />
            <Text style={styles.loadingText}>جارٍ التحميل...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={hasError ? { html: FALLBACK_HTML } : { uri: PRIVACY_POLICY_URL }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setHasError(true);
            setLoading(false);
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F6',
  },
  header: {
    backgroundColor: THEME_NAVY,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: THEME_YELLOW,
    fontSize: 20,
    fontFamily: 'Cairo-Black',
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(243,205,13,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#F4F7F6',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F4F7F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: 'Cairo-Black',
    color: THEME_NAVY,
  },
});

export default DriverPrivacyPolicyScreen;
