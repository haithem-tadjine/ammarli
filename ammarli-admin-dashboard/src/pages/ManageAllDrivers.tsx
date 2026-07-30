import { useState, useEffect } from 'react';
import { Users, User, Car, Smartphone } from 'lucide-react';
import api from '../api';

export default function ManageAllDrivers() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    customers: 0,
    drivers: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/stats');
      setStats({
        totalUsers: res.data.totalUsers || 0,
        customers: res.data.customers || 0,
        drivers: res.data.drivers || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-4 glass-panel animate-fade-in" style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--accent-color)', padding: '8px', borderRadius: '8px' }}>
          <Users size={24} color="white" />
        </div>
        <h2 style={{ margin: 0 }}>تقرير مستخدمي التطبيق</h2>
      </div>

      <div className="responsive-grid-equal animate-fade-in" style={{ animationDelay: '0.1s' }}>
        
        <div className="glass-panel text-center" style={{ padding: '40px 24px' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#3b82f6' }}>
            <Smartphone size={40} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>إجمالي مستخدمي التطبيق</h3>
          {loading ? <h2>...</h2> : <h1 style={{ margin: 0, fontSize: '3rem', color: 'var(--text-primary)' }}>{stats.totalUsers.toLocaleString()}</h1>}
        </div>

        <div className="glass-panel text-center" style={{ padding: '40px 24px' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#10b981' }}>
            <User size={40} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>الزبائن (العملاء)</h3>
          {loading ? <h2>...</h2> : <h1 style={{ margin: 0, fontSize: '3rem', color: 'var(--text-primary)' }}>{stats.customers.toLocaleString()}</h1>}
        </div>

        <div className="glass-panel text-center" style={{ padding: '40px 24px' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#f59e0b' }}>
            <Car size={40} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>عدد السائقين النشطين</h3>
          {loading ? <h2>...</h2> : <h1 style={{ margin: 0, fontSize: '3rem', color: 'var(--text-primary)' }}>{stats.drivers.toLocaleString()}</h1>}
        </div>

      </div>
    </div>
  );
}
