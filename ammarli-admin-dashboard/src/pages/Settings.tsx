import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Percent, ShieldCheck, Bell } from 'lucide-react';
import api from '../api';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [settings, setSettings] = useState({
    bottledCommission: '3',
    tankerSpringCommission: '0.3',
    tankerWellCommission: '50',
    tankerWellVolumeUnit: '1500',
    maxDebtAllowed: '2000',
    enableAutoSuspend: true,
    maintenanceMode: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data) {
        setSettings({
          bottledCommission: response.data.bottledCommission?.toString() || '3',
          tankerSpringCommission: response.data.tankerSpringCommission?.toString() || '0.3',
          tankerWellCommission: response.data.tankerWellCommission?.toString() || '50',
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
        tankerSpringCommission: Number(settings.tankerSpringCommission),
        tankerWellCommission: Number(settings.tankerWellCommission),
        tankerWellVolumeUnit: Number(settings.tankerWellVolumeUnit),
        maxDebtAllowed: Number(settings.maxDebtAllowed),
        enableAutoSuspend: settings.enableAutoSuspend,
        maintenanceMode: settings.maintenanceMode,
      });
      
      setSuccess('تم حفظ الإعدادات بنجاح!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMsg('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-4 glass-panel animate-fade-in" style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--accent-color)', padding: '8px', borderRadius: '8px' }}>
          <SettingsIcon size={24} color="white" />
        </div>
        <h2 style={{ margin: 0 }}>إعدادات النظام العامة</h2>
      </div>

      {success && (
        <div className="animate-fade-in" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} /> {success}
        </div>
      )}

      {errorMsg && (
        <div className="animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Financial Settings */}
        <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Percent size={20} color="var(--accent-color)" /> إعدادات العمولة والديون
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)' }}>عمولة قارورات المياه (دج / قارورة)</label>
            <input 
              type="number" 
              className="input-glass" 
              value={settings.bottledCommission}
              onChange={e => setSettings({...settings, bottledCommission: e.target.value})}
              min="0" step="0.01"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)' }}>عمولة صهاريج مياه الينابيع (دج / لتر)</label>
            <input 
              type="number" 
              className="input-glass" 
              value={settings.tankerSpringCommission}
              onChange={e => setSettings({...settings, tankerSpringCommission: e.target.value})}
              min="0" step="0.01"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)' }}>عمولة صهاريج مياه الآبار (دج)</label>
            <input 
              type="number" 
              className="input-glass" 
              value={settings.tankerWellCommission}
              onChange={e => setSettings({...settings, tankerWellCommission: e.target.value})}
              min="0" step="0.01"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)' }}>وحدة قياس مياه الآبار (لتر)</label>
            <input 
              type="number" 
              className="input-glass" 
              value={settings.tankerWellVolumeUnit}
              onChange={e => setSettings({...settings, tankerWellVolumeUnit: e.target.value})}
              min="1"
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>تُخصم العمولة السابقة على كل وحدة من هذا الحجم (مثال: 50 دج لكل 1500 لتر).</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <label style={{ color: 'var(--text-secondary)' }}>الحد الأقصى للدين المسموح به (دج)</label>
            <input 
              type="number" 
              className="input-glass" 
              value={settings.maxDebtAllowed}
              onChange={e => setSettings({...settings, maxDebtAllowed: e.target.value})}
              min="0"
            />
          </div>
        </div>

        {/* Operational Settings */}
        <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} color="var(--accent-color)" /> إعدادات التشغيل
          </h3>

          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
            <input 
              type="checkbox" 
              checked={settings.enableAutoSuspend}
              onChange={e => setSettings({...settings, enableAutoSuspend: e.target.checked})}
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>تفعيل الإيقاف التلقائي</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>سيتم إيقاف السائق تلقائياً إذا تجاوز الحد الأقصى للدين.</span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px' }}>
            <input 
              type="checkbox" 
              checked={settings.maintenanceMode}
              onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})}
              style={{ width: '20px', height: '20px', accentColor: '#ef4444' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#fca5a5' }}>وضع الصيانة</span>
              <span style={{ fontSize: '12px', color: '#ef4444' }}>إيقاف التطبيق مؤقتاً لجميع السائقين والعملاء.</span>
            </div>
          </label>
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" className="btn-primary" style={{ padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading}>
            <Save size={20} /> {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </form>
    </div>
  );
}
