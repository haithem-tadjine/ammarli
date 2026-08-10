import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Percent, ShieldCheck, Activity, CreditCard, Droplets, Truck, Lock, Unlock } from 'lucide-react';
import api from '../api';
import geoData from '../data/geo.json';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [settings, setSettings] = useState({
    bottledCommission: '3',
    bottledCustomerMarkup: '3',
    tankerSpringCommission: '0.3',
    tankerSpringCustomerMarkup: '5',
    tankerWellCommission: '50',
    tankerWellCustomerMarkup: '50',
    tankerWellVolumeUnit: '1500',
    maxDebtAllowed: '2000',
    enableAutoSuspend: true,
    maintenanceMode: false
  });

  const [wilayas, setWilayas] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchWilayas();
  }, []);

  const fetchWilayas = async () => {
    try {
      const response = await api.get('/wilayas');
      if (response.data) setWilayas(response.data);
    } catch (error) {
      console.error('Error fetching wilayas:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data) {
        setSettings({
          bottledCommission: response.data.bottledCommission?.toString() || '3',
          bottledCustomerMarkup: response.data.bottledCustomerMarkup?.toString() || '3',
          tankerSpringCommission: response.data.tankerSpringCommission?.toString() || '0.3',
          tankerSpringCustomerMarkup: response.data.tankerSpringCustomerMarkup?.toString() || '5',
          tankerWellCommission: response.data.tankerWellCommission?.toString() || '50',
          tankerWellCustomerMarkup: response.data.tankerWellCustomerMarkup?.toString() || '50',
          tankerWellVolumeUnit: response.data.tankerWellVolumeUnit?.toString() || '1500',
          maxDebtAllowed: response.data.maxDebtAllowed?.toString() || '2000',
          enableAutoSuspend: response.data.enableAutoSuspend ?? true,
          maintenanceMode: response.data.maintenanceMode ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setErrorMsg('');
    
    try {
      await api.put('/settings', {
        bottledCommission: Number(settings.bottledCommission),
        bottledCustomerMarkup: Number(settings.bottledCustomerMarkup),
        tankerSpringCommission: Number(settings.tankerSpringCommission),
        tankerSpringCustomerMarkup: Number(settings.tankerSpringCustomerMarkup),
        tankerWellCommission: Number(settings.tankerWellCommission),
        tankerWellCustomerMarkup: Number(settings.tankerWellCustomerMarkup),
        tankerWellVolumeUnit: Number(settings.tankerWellVolumeUnit),
        maxDebtAllowed: Number(settings.maxDebtAllowed),
        enableAutoSuspend: settings.enableAutoSuspend,
        maintenanceMode: settings.maintenanceMode,
      });
      
      setSuccess('تم حفظ الإعدادات بنجاح! 🚀');
      setTimeout(() => setSuccess(''), 4000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMsg('حدث خطأ أثناء حفظ الإعدادات. يرجى المحاولة مرة أخرى.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <SettingsIcon size={28} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              إعدادات النظام العامة
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              إدارة العمولات، أسقف الديون، وحالات التشغيل الخاصة بالمنصة
            </p>
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{
            background: loading ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white', border: 'none', borderRadius: '12px', padding: '14px 28px',
            fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 8px 16px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s ease',
            transform: loading ? 'scale(0.98)' : 'scale(1)'
          }}
        >
          <Save size={20} /> {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </div>

      {/* ── Alerts ── */}
      {success && (
        <div className="animate-fade-in" style={{ background: 'linear-gradient(to right, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))', borderRight: '4px solid #10b981', color: '#34d399', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <ShieldCheck size={24} /> <span style={{ fontSize: '15px', fontWeight: '600' }}>{success}</span>
        </div>
      )}

      {errorMsg && (
        <div className="animate-fade-in" style={{ background: 'linear-gradient(to right, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))', borderRight: '4px solid #ef4444', color: '#f87171', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <Activity size={24} /> <span style={{ fontSize: '15px', fontWeight: '600' }}>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* ── Financial & Commission Settings ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Percent size={20} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>العمولات والتسعير</h2>
          </div>
          
          <div className="responsive-grid-equal">
            {/* Bottled */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '10px' }}><Droplets size={20} color="#3b82f6" /></div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>قارورات المياه</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>إجمالي العمولة المقتطعة من السائق</p>
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <input type="number" className="input-glass" value={settings.bottledCommission} onChange={e => setSettings({...settings, bottledCommission: e.target.value})} min="0" step="0.01" style={{ fontSize: '18px', fontWeight: 'bold', paddingRight: '40px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>د.ج</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>الزيادة المضافة لسعر الزبون</p>
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <input type="number" className="input-glass" value={settings.bottledCustomerMarkup} onChange={e => setSettings({...settings, bottledCustomerMarkup: e.target.value})} min="0" step="0.01" style={{ fontSize: '18px', fontWeight: 'bold', paddingRight: '40px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>د.ج</span>
              </div>
            </div>

            {/* Spring Water */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '4px solid #06b6d4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '10px', borderRadius: '10px' }}><Droplets size={20} color="#06b6d4" /></div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>صهاريج ينابيع</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>إجمالي العمولة المقتطعة من السائق (للدلو)</p>
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <input type="number" className="input-glass" value={settings.tankerSpringCommission} onChange={e => setSettings({...settings, tankerSpringCommission: e.target.value})} min="0" step="0.01" style={{ fontSize: '18px', fontWeight: 'bold', paddingRight: '40px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>د.ج</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>الزيادة المضافة لسعر الزبون (للدلو)</p>
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <input type="number" className="input-glass" value={settings.tankerSpringCustomerMarkup} onChange={e => setSettings({...settings, tankerSpringCustomerMarkup: e.target.value})} min="0" step="0.01" style={{ fontSize: '18px', fontWeight: 'bold', paddingRight: '40px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>د.ج</span>
              </div>
            </div>

            {/* Well Water */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '10px' }}><Truck size={20} color="#f59e0b" /></div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>صهاريج مياه الآبار / الأشغال</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>إجمالي العمولة المقتطعة من السائق (للصهريج)</p>
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <input type="number" className="input-glass" value={settings.tankerWellCommission} onChange={e => setSettings({...settings, tankerWellCommission: e.target.value})} min="0" step="0.01" style={{ fontSize: '18px', fontWeight: 'bold', paddingRight: '40px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>د.ج</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>الزيادة المضافة لسعر الزبون (للصهريج)</p>
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <input type="number" className="input-glass" value={settings.tankerWellCustomerMarkup} onChange={e => setSettings({...settings, tankerWellCustomerMarkup: e.target.value})} min="0" step="0.01" style={{ fontSize: '18px', fontWeight: 'bold', paddingRight: '40px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>د.ج</span>
              </div>
            </div>

            {/* Well Water Unit */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '10px' }}><Activity size={20} color="#8b5cf6" /></div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>وحدة مياه الآبار</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>تُخصم العمولة السابقة على كل وحدة من هذا الحجم</p>
              <div style={{ position: 'relative', marginTop: 'auto' }}>
                <input type="number" className="input-glass" value={settings.tankerWellVolumeUnit} onChange={e => setSettings({...settings, tankerWellVolumeUnit: e.target.value})} min="1" style={{ fontSize: '18px', fontWeight: 'bold', paddingRight: '40px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>لتر</span>
              </div>
            </div>
          </div>
        </section>

        <div className="responsive-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          
          {/* ── Global Debt Setting ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CreditCard size={20} color="#ef4444" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>المديونية والإيقاف</h2>
            </div>
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>الحد الأقصى للدين المسموح به</label>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>القيمة الافتراضية للديون قبل اتخاذ إجراء ضد السائق</p>
                <div style={{ position: 'relative' }}>
                  <input type="number" className="input-glass" value={settings.maxDebtAllowed} onChange={e => setSettings({...settings, maxDebtAllowed: e.target.value})} min="0" style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#f87171', fontWeight: 'bold' }}>د.ج</span>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--glass-border)' }}></div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', background: settings.enableAutoSuspend ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: settings.enableAutoSuspend ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--glass-border)', transition: 'all 0.3s' }}>
                <input 
                  type="checkbox" 
                  checked={settings.enableAutoSuspend}
                  onChange={e => setSettings({...settings, enableAutoSuspend: e.target.checked})}
                  style={{ width: '22px', height: '22px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: settings.enableAutoSuspend ? '#34d399' : '#f8fafc' }}>تفعيل الإيقاف التلقائي</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>سيتم منع السائق من العمل تلقائياً إذا تجاوز الحد الأقصى للدين الموضح أعلاه.</span>
                </div>
              </label>

            </div>
          </section>

          {/* ── System Status ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ShieldCheck size={20} color="#f59e0b" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>حالة النظام</h2>
            </div>
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 'calc(100% - 44px)' }}>
              
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '40px', 
                  background: settings.maintenanceMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  boxShadow: settings.maintenanceMode ? '0 0 20px rgba(239,68,68,0.2)' : '0 0 20px rgba(16,185,129,0.2)'
                }}>
                  {settings.maintenanceMode ? <Lock size={40} color="#ef4444" /> : <Unlock size={40} color="#10b981" />}
                </div>
                <h3 style={{ margin: 0, color: settings.maintenanceMode ? '#ef4444' : '#10b981', fontSize: '24px' }}>
                  {settings.maintenanceMode ? 'النظام متوقف (صيانة)' : 'النظام يعمل بشكل طبيعي'}
                </h3>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', background: settings.maintenanceMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: settings.maintenanceMode ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--glass-border)', transition: 'all 0.3s' }}>
                <input 
                  type="checkbox" 
                  checked={settings.maintenanceMode}
                  onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})}
                  style={{ width: '24px', height: '24px', accentColor: '#ef4444', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: settings.maintenanceMode ? '#fca5a5' : '#f8fafc' }}>تفعيل وضع الصيانة</span>
                  <span style={{ fontSize: '13px', color: settings.maintenanceMode ? '#f87171' : 'var(--text-secondary)' }}>إيقاف التطبيق مؤقتاً لجميع السائقين والعملاء (خطر).</span>
                </div>
              </label>
            </div>
          </section>

        </div>

        {/* ── Wilaya & Commune Exceptions ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={20} color="#8b5cf6" />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>إستثناءات الديون حسب الولاية والبلدية</h2>
          </div>
          <div className="glass-panel" style={{ padding: '32px', borderRadius: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: 0, marginBottom: '24px' }}>
              حدد الولايات أو البلديات المعفاة من سقف الديون. السائقون في هذه المناطق يمكنهم تلقي الطلبات حتى لو تجاوزوا الحد الأقصى للدين.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {geoData.map(wilayaDef => {
                const codeStr = wilayaDef.code.toString().padStart(2, '0');
                // Find data from backend, or use default
                const wilayaData = wilayas.find(w => w.code === codeStr) || { code: codeStr, isDebtCeilingEnabled: true, exemptedCommunes: [] };
                const isActive = wilayaData.isDebtCeilingEnabled;
                const exemptedCommunes = wilayaData.exemptedCommunes || [];
                
                // Get communes for this wilaya
                const communesList = wilayaDef.communes;

                return (
                  <div key={wilayaDef.code} style={{ 
                    background: isActive ? 'rgba(255,255,255,0.02)' : 'rgba(139, 92, 246, 0.05)',
                    border: isActive ? '1px solid var(--glass-border)' : '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px', padding: '20px', transition: 'all 0.3s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: isActive ? '#f8fafc' : '#c4b5fd' }}>
                          {codeStr} - {wilayaDef.name_ar} ({wilayaDef.name_fr})
                        </span>
                        <span style={{ fontSize: '13px', color: isActive ? 'var(--text-secondary)' : '#a78bfa', marginTop: '4px' }}>
                          {isActive ? 'تخضع لسقف الديون (يمكنك استثناء بلديات محددة أدناه)' : 'جميع بلديات هذه الولاية معفاة من سقف الديون'}
                        </span>
                      </div>
                      
                      <div className="toggle-switch-wrapper" style={{ position: 'relative' }}>
                        <input 
                          type="checkbox" 
                          checked={isActive}
                          onChange={async (e) => {
                            const isEnabled = e.target.checked;
                            const updatedWilayas = [...wilayas];
                            const idx = updatedWilayas.findIndex(w => w.code === codeStr);
                            if (idx >= 0) updatedWilayas[idx].isDebtCeilingEnabled = isEnabled;
                            else updatedWilayas.push({ ...wilayaData, isDebtCeilingEnabled: isEnabled });
                            setWilayas(updatedWilayas);
                            
                            try {
                              await api.patch(`/wilayas/${codeStr}/debt-limit`, { isDebtCeilingEnabled: isEnabled });
                              setSuccess(`تم تحديث إعدادات ولاية ${wilayaDef.name_ar}`);
                              setTimeout(() => setSuccess(''), 3000);
                            } catch (err) {
                              setErrorMsg('يرجى التأكد من أن قاعدة البيانات تحتوي على هذه الولاية.');
                              setTimeout(() => setErrorMsg(''), 4000);
                            }
                          }}
                          style={{ 
                            width: '44px', height: '24px', appearance: 'none', 
                            background: isActive ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                            borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'all 0.3s'
                          }}
                        />
                        <div style={{
                          position: 'absolute', top: '2px', left: isActive ? '2px' : '22px',
                          width: '20px', height: '20px', background: 'white', borderRadius: '10px',
                          pointerEvents: 'none', transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </div>

                    {/* Commune Exceptions (Only relevant if Wilaya as a whole is NOT exempt) */}
                    {isActive && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
                          البلديات المستثناة في هذه الولاية:
                        </label>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                          {exemptedCommunes.length === 0 ? (
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>لا توجد بلديات مستثناة</span>
                          ) : (
                            exemptedCommunes.map((commune: string) => (
                              <div key={commune} style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {commune}
                                <button type="button" style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: 0 }}
                                  onClick={async () => {
                                    // Remove commune
                                    const newCommunes = exemptedCommunes.filter((c: string) => c !== commune);
                                    const updatedWilayas = [...wilayas];
                                    const idx = updatedWilayas.findIndex(w => w.code === codeStr);
                                    if (idx >= 0) updatedWilayas[idx].exemptedCommunes = newCommunes;
                                    setWilayas(updatedWilayas);
                                    
                                    try {
                                      await api.patch(`/wilayas/${codeStr}/debt-limit`, { exemptedCommunes: newCommunes });
                                    } catch(e) { console.error(e); }
                                  }}
                                >×</button>
                              </div>
                            ))
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select 
                            className="input-glass"
                            style={{ padding: '8px 12px', fontSize: '13px', flex: 1 }}
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val && !exemptedCommunes.includes(val)) {
                                const newCommunes = [...exemptedCommunes, val];
                                const updatedWilayas = [...wilayas];
                                let idx = updatedWilayas.findIndex(w => w.code === codeStr);
                                if (idx === -1) {
                                  updatedWilayas.push({ ...wilayaData, isDebtCeilingEnabled: true, exemptedCommunes: newCommunes });
                                } else {
                                  updatedWilayas[idx].exemptedCommunes = newCommunes;
                                }
                                setWilayas(updatedWilayas);
                                e.target.value = ''; // Reset select
                                
                                try {
                                  await api.patch(`/wilayas/${codeStr}/debt-limit`, { exemptedCommunes: newCommunes });
                                  setSuccess(`تم إضافة ${val} إلى الاستثناءات`);
                                  setTimeout(() => setSuccess(''), 3000);
                                } catch (err) {
                                  setErrorMsg('يرجى التأكد من أن قاعدة البيانات تحتوي على هذه الولاية.');
                                  setTimeout(() => setErrorMsg(''), 4000);
                                }
                              }
                            }}
                          >
                            <option value="">-- اختر البلدية لإضافتها للاستثناءات --</option>
                            {communesList.map((c: any) => (
                              <option key={c.code} value={c.name_ar}>{c.name_ar} ({c.name_fr})</option>
                            ))}
                          </select>
                        </div>
                        
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
