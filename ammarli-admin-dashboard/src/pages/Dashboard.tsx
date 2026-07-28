import { useState, useEffect } from 'react';
import { Users, BarChart3, TrendingUp, Settings, MapPin } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, userStatsRes, managersRes] = await Promise.all([
          api.get('/statistics/dashboard'),
          api.get('/users/stats'),
          api.get('/users?role=WILAYA_MANAGER')
        ]);
        setStats(statsRes.data);
        setUserStats(userStatsRes.data);
        
        // Sort and limit managers to top 5
        const sortedManagers = managersRes.data.data.sort((a: any, b: any) => {
          const wilayaA = a.managedWilaya || '';
          const wilayaB = b.managedWilaya || '';
          return wilayaA.localeCompare(wilayaB);
        });
        setManagers(sortedManagers.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-4 glass-panel animate-fade-in" style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--accent-color)', padding: '8px', borderRadius: '8px' }}>
          <BarChart3 size={24} color="white" />
        </div>
        <h2 style={{ margin: 0 }}>لوحة المدير التنفيذي</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }} className="animate-fade-in">
        {/* Stats Card */}
        <div className="glass-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>الأرباح الكلية</h3>
            <TrendingUp color="var(--success-color)" />
          </div>
          <h1 style={{ fontSize: '2.5rem', margin: '8px 0' }}>
            {loading ? '...' : `${(stats?.revenue?.totalGross || 0).toLocaleString()} د.ج`}
          </h1>
          <p style={{ color: 'var(--success-color)', margin: 0 }}>مبني على جميع الطلبات المكتملة</p>
        </div>

        {/* Users Card */}
        <div className="glass-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>السائقين النشطين</h3>
            <Users color="var(--accent-color)" />
          </div>
          <h1 style={{ fontSize: '2.5rem', margin: '8px 0' }}>
            {loading ? '...' : userStats?.activeDrivers || 0}
          </h1>
          <p style={{ margin: 0 }}>إجمالي السائقين المتاحين للعمل</p>
        </div>
      </div>

      <div className="glass-panel mt-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ margin: 0 }}>مدراء الولايات</h3>
          <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.875rem' }}>
            + إضافة مدير جديد
          </button>
        </div>
        
        <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px' }}>الاسم</th>
              <th style={{ padding: '12px' }}>الولاية</th>
              <th style={{ padding: '12px' }}>رقم الهاتف</th>
              <th style={{ padding: '12px' }}>إدارة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center' }}>جاري التحميل...</td>
              </tr>
            ) : managers.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد مدراء ولايات مسجلين</td>
              </tr>
            ) : (
              managers.map((m, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '12px' }}>{m.firstName} {m.lastName}</td>
                  <td style={{ padding: '12px' }}>
                    {m.managedWilaya ? (
                      <span style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--accent-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {m.managedWilaya}
                      </span>
                    ) : '---'}
                  </td>
                  <td style={{ padding: '12px' }} dir="ltr" align="right">{m.phone}</td>
                  <td style={{ padding: '12px' }}>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}>
                      <Settings size={20} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
