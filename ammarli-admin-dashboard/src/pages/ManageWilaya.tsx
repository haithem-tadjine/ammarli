import { useState, useEffect } from 'react';
import { UserPlus, Map, AlertTriangle, Wallet } from 'lucide-react';
import api from '../api';

const ALGERIA_WILAYAS = [
  '01 - أدرار', '02 - الشلف', '03 - الأغواط', '04 - أم البواقي', '05 - باتنة', '06 - بجاية', '07 - بسكرة', '08 - بشار', '09 - البليدة', '10 - البويرة',
  '11 - تمنراست', '12 - تبسة', '13 - تلمسان', '14 - تيارت', '15 - تيزي وزو', '16 - الجزائر', '17 - الجلفة', '18 - جيجل', '19 - سطيف', '20 - سعيدة',
  '21 - سكيكدة', '22 - سيدي بلعباس', '23 - عنابة', '24 - قالمة', '25 - قسنطينة', '26 - المدية', '27 - مستغانم', '28 - المسيلة', '29 - معسكر', '30 - ورقلة',
  '31 - وهران', '32 - البيض', '33 - إليزي', '34 - برج بوعريريج', '35 - بومرداس', '36 - الطارف', '37 - تندوف', '38 - تيسمسيلت', '39 - الوادي', '40 - خنشلة',
  '41 - سوق أهراس', '42 - تيبازة', '43 - ميلة', '44 - عين الدفلى', '45 - النعامة', '46 - عين تموشنت', '47 - غرداية', '48 - غليزان', '49 - تيميمون', '50 - برج باجي مختار',
  '51 - أولاد جلال', '52 - بني عباس', '53 - عين صالح', '54 - عين قزام', '55 - تقرت', '56 - جانت', '57 - المغير', '58 - المنيعة'
];

export default function ManageWilaya() {
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    managedWilaya: ''
  });

  const fetchManagers = async () => {
    try {
      const res = await api.get('/users?role=WILAYA_MANAGER');
      const sortedManagers = res.data.data.sort((a: any, b: any) => {
        const wilayaA = a.managedWilaya || '';
        const wilayaB = b.managedWilaya || '';
        return wilayaA.localeCompare(wilayaB);
      });
      setManagers(sortedManagers);
    } catch (err) {
      console.error('Error fetching managers:', err);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/users/managers', {
        ...formData,
        role: 'WILAYA_MANAGER'
      });

      setSuccess('تم إضافة مدير الولاية بنجاح!');
      setFormData({ firstName: '', lastName: '', phone: '', password: '', managedWilaya: '' });
      fetchManagers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء إضافة المدير');
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
        <h2 style={{ margin: 0 }}>إدارة مدراء الولايات</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Add Manager Form */}
        <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s', position: 'sticky', top: '24px' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '8px' }}>
              <UserPlus size={20} color="var(--accent-color)" />
            </div>
            إضافة مدير جديد
          </h3>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '14px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 'bold' }}>
              <AlertTriangle size={20} /> {error}
            </div>
          )}

          {success && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontWeight: 'bold' }}>
              ✨ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الاسم الأول</label>
              <input 
                type="text" 
                className="input-glass" 
                placeholder="أدخل الاسم" 
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>اللقب</label>
              <input 
                type="text" 
                className="input-glass" 
                placeholder="أدخل اللقب" 
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>رقم الهاتف</label>
              <input 
                type="text" 
                className="input-glass" 
                placeholder="مثال: 0555123456" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>كلمة المرور</label>
              <input 
                type="password" 
                className="input-glass" 
                placeholder="كلمة المرور للدخول" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>الولاية</label>
              <select
                className="input-glass"
                value={formData.managedWilaya}
                onChange={e => setFormData({...formData, managedWilaya: e.target.value})}
                required
                style={{ appearance: 'none', cursor: 'pointer', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23D4AF37%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'left 16px center', backgroundSize: '12px auto' }}
              >
                <option value="" disabled>اختر الولاية ...</option>
                {ALGERIA_WILAYAS.map(wilaya => (
                  <option key={wilaya} value={wilaya}>{wilaya}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary mt-4" disabled={loading} style={{ padding: '14px', fontSize: '1rem', fontWeight: 'bold' }}>
              {loading ? 'جاري الإضافة...' : 'إضافة المدير'}
            </button>
          </form>
        </div>

        {/* Managers List */}
        <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', padding: '0' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '8px' }}>
                <Map size={20} color="var(--accent-color)" />
              </div>
              قائمة مدراء الولايات
            </h3>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem' }}>الاسم الكامل</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem' }}>رقم الهاتف</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem' }}>الرصيد الافتراضي (دج)</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {managers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Map size={48} opacity={0.2} />
                        لا يوجد مدراء مسجلين حتى الآن
                      </div>
                    </td>
                  </tr>
                ) : (
                  managers.map((m, idx) => (
                    <tr key={idx} style={{ 
                      borderBottom: '1px solid var(--glass-border)',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{m.firstName} {m.lastName}</span>
                          {m.managedWilaya && (
                            <span style={{ 
                              fontSize: '0.75rem', 
                              background: 'linear-gradient(90deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)', 
                              color: 'var(--accent-color)', 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              fontWeight: 'bold',
                              display: 'inline-block',
                              width: 'fit-content',
                              border: '1px solid rgba(212,175,55,0.2)'
                            }}>
                              مدير {m.managedWilaya}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', color: 'var(--text-secondary)' }} dir="ltr" align="right">{m.phone}</td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{ 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          color: '#10b981', 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          fontWeight: 'bold',
                          fontFamily: 'monospace',
                          fontSize: '1.1rem'
                        }}>
                          {Number(m.walletBalance || 0).toLocaleString()} دج
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }}>
                          <Wallet size={16} /> شحن
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
