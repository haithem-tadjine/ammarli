import { useState, useEffect } from 'react';
import { UserPlus, Map, AlertTriangle, Wallet } from 'lucide-react';
import api from '../api';
import geoData from '../data/geo.json';

export default function ManageCommune() {
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableCommunes, setAvailableCommunes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    managedWilaya: '',
    managedCommune: ''
  });

  const fetchManagers = async () => {
    try {
      const response = await api.get('/users/managers?role=COMMUNE_MANAGER');
      setManagers(response.data);
    } catch (err) {
      console.error('Failed to fetch managers', err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/users/me'); 
      const wilaya = response.data.managedWilaya;
      if (wilaya) {
        setFormData(prev => ({ ...prev, managedWilaya: wilaya }));
        
        const wilayaStr = wilaya?.toString().trim();
        const wilayaData = geoData.wilayas.find((w: any) => 
          w.name_fr?.toString().trim().toLowerCase() === wilayaStr?.toLowerCase() || 
          w.name_ar?.toString().trim() === wilayaStr
        );
        if (wilayaData) {
          const communesForWilaya = geoData.communes.filter((c: any) => 
            String(c.wilaya_code) === String(wilayaData.code)
          );
          setAvailableCommunes(communesForWilaya);
        }
      }
    } catch (err) {
      console.error('Failed to fetch current user', err);
    }
  };

  useEffect(() => {
    fetchManagers();
    fetchCurrentUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/users/managers', {
        ...formData,
        role: 'COMMUNE_MANAGER'
      });

      setSuccess('تم إضافة مدير البلدية بنجاح!');
      setFormData(prev => ({ ...prev, firstName: '', lastName: '', phone: '', password: '', managedCommune: '' }));
      fetchManagers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-4 glass-panel animate-fade-in" style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--accent-color)', padding: '8px', borderRadius: '8px' }}>
          <Map size={24} color="white" />
        </div>
        <h2 style={{ margin: 0 }}>إدارة مدراء البلديات</h2>
      </div>

      <div className="responsive-grid">
        <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="var(--accent-color)" /> إضافة مدير جديد
          </h3>

          {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '8px' }}><AlertTriangle size={20} /> {error}</div>}
          {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" className="input-glass" placeholder="الاسم الأول" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
            <input type="text" className="input-glass" placeholder="اللقب" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
            <input type="text" className="input-glass" placeholder="رقم الهاتف" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
            <input type="password" className="input-glass" placeholder="كلمة المرور" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
            
            <input 
              type="text" 
              className="input-glass" 
              placeholder="الولاية التابع لها" 
              value={formData.managedWilaya} 
              disabled 
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
              title="هذه الولاية محددة تلقائياً بناءً على حسابك"
              required 
            />
            
            <select 
              className="input-glass" 
              value={formData.managedCommune} 
              onChange={e => setFormData({...formData, managedCommune: e.target.value})} 
              required
            >
              <option value="" disabled>اختر البلدية</option>
              {availableCommunes.map((c: any) => (
                <option key={c.code_commune || c.name_ar} value={c.name_ar}>{c.name_ar}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary mt-4" disabled={loading}>
              {loading ? 'جاري الإضافة...' : 'إضافة المدير'}
            </button>
          </form>
        </div>

        <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 style={{ marginTop: 0 }}>قائمة مدراء البلديات</h3>
          <div className="table-responsive">
            <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', marginTop: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px' }}>الاسم</th>
                  <th style={{ padding: '12px' }}>رقم الهاتف</th>
                  <th style={{ padding: '12px' }}>الولاية</th>
                  <th style={{ padding: '12px' }}>البلدية</th>
                  <th style={{ padding: '12px' }}>الرصيد (دج)</th>
                  <th style={{ padding: '12px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {managers.length === 0 ? <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد مدراء حتى الآن</td></tr> : managers.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '12px' }}>{m.firstName} {m.lastName}</td>
                    <td style={{ padding: '12px' }}>{m.phone}</td>
                    <td style={{ padding: '12px' }}>{m.managedWilaya}</td>
                    <td style={{ padding: '12px' }}>{m.managedCommune}</td>
                    <td style={{ padding: '12px', color: 'var(--success-color)', fontWeight: 'bold' }}>{m.walletBalance?.toLocaleString() || 0}</td>
                    <td style={{ padding: '12px' }}>
                      <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Wallet size={14} /> شحن الرصيد
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
