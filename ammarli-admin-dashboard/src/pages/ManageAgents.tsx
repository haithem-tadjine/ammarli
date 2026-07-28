import { useState, useEffect } from 'react';
import { UserPlus, ShieldAlert, AlertTriangle, Wallet } from 'lucide-react';

export default function ManageAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    managedWilaya: '',
    managedCommune: ''
  });

  const fetchAgents = async () => {
    // Mock for now
    setAgents([
      { firstName: 'مراد', lastName: 'الدين', phone: '0777555666', managedWilaya: 'باتنة', managedCommune: 'بريكة', balance: 15000 },
      { firstName: 'سليم', lastName: 'حاجي', phone: '0666777888', managedWilaya: 'الجزائر', managedCommune: 'زرالدة', balance: 5000 }
    ]);
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:3000/api/users/managers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          role: 'AGENT'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'حدث خطأ أثناء الإضافة');
      }

      setSuccess('تم إضافة الوكيل بنجاح!');
      setFormData({ firstName: '', lastName: '', phone: '', password: '', managedWilaya: '', managedCommune: '' });
      fetchAgents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-4 glass-panel animate-fade-in" style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--accent-color)', padding: '8px', borderRadius: '8px' }}>
          <ShieldAlert size={24} color="white" />
        </div>
        <h2 style={{ margin: 0 }}>إدارة الوكلاء (الكاشير)</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="var(--accent-color)" /> إضافة وكيل جديد
          </h3>

          {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '8px' }}><AlertTriangle size={20} /> {error}</div>}
          {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" className="input-glass" placeholder="الاسم الأول" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
            <input type="text" className="input-glass" placeholder="اللقب" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
            <input type="text" className="input-glass" placeholder="رقم الهاتف" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
            <input type="password" className="input-glass" placeholder="كلمة المرور" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
            <input type="text" className="input-glass" placeholder="الولاية التابع لها" value={formData.managedWilaya} onChange={e => setFormData({...formData, managedWilaya: e.target.value})} required />
            <input type="text" className="input-glass" placeholder="البلدية" value={formData.managedCommune} onChange={e => setFormData({...formData, managedCommune: e.target.value})} required />
            <button type="submit" className="btn-primary mt-4" disabled={loading}>
              {loading ? 'جاري الإضافة...' : 'إضافة الوكيل'}
            </button>
          </form>
        </div>

        <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 style={{ marginTop: 0 }}>قائمة الوكلاء</h3>
          <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', marginTop: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px' }}>الاسم</th>
                <th style={{ padding: '12px' }}>رقم الهاتف</th>
                <th style={{ padding: '12px' }}>المنطقة</th>
                <th style={{ padding: '12px' }}>الرصيد الافتراضي (دج)</th>
                <th style={{ padding: '12px' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد وكلاء حتى الآن</td></tr> : agents.map((a, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '12px' }}>{a.firstName} {a.lastName}</td>
                  <td style={{ padding: '12px' }}>{a.phone}</td>
                  <td style={{ padding: '12px' }}>{a.managedWilaya} - {a.managedCommune}</td>
                  <td style={{ padding: '12px', color: 'var(--success-color)', fontWeight: 'bold' }}>{a.balance?.toLocaleString() || 0}</td>
                  <td style={{ padding: '12px' }}>
                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Wallet size={14} /> تزويد بالرصيد
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
