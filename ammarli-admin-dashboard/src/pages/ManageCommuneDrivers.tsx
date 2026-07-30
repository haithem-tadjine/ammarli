import { useState, useEffect } from 'react';
import { Users, Search, AlertTriangle, Wallet } from 'lucide-react';

export default function ManageCommuneDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDrivers = async () => {
    setLoading(true);
    // Mock drivers for this specific commune
    try {
      setTimeout(() => {
        setDrivers([
          { id: 1, name: 'سالم عبد الله', phone: '0555112233', debt: 4500, isSuspended: true },
          { id: 2, name: 'طارق يحيى', phone: '0666998877', debt: 1500, isSuspended: false },
          { id: 3, name: 'وليد كريم', phone: '0777445566', debt: 0, isSuspended: false },
        ]);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const filteredDrivers = drivers.filter(d => 
    d.name.includes(search) || d.phone.includes(search)
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-4 glass-panel animate-fade-in" style={{ padding: '16px 24px' }}>
        <div style={{ background: 'var(--accent-color)', padding: '8px', borderRadius: '8px' }}>
          <Users size={24} color="white" />
        </div>
        <h2 style={{ margin: 0 }}>سائقي البلدية (شحن الأرصدة وتسديد الديون)</h2>
      </div>

      <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ margin: 0 }}>السائقين ({drivers.length})</h3>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', right: '12px', top: '12px' }} />
            <input 
              type="text" 
              className="input-glass" 
              placeholder="البحث بالاسم، الهاتف..." 
              style={{ paddingRight: '40px' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>جاري تحميل البيانات...</div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', marginTop: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px' }}>اسم السائق</th>
                  <th style={{ padding: '12px' }}>رقم الهاتف</th>
                  <th style={{ padding: '12px' }}>الديون المتراكمة (DZD)</th>
                  <th style={{ padding: '12px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      لا يوجد نتائج للبحث
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => (
                    <tr key={driver.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'all 0.2s ease' }} className="hover:bg-slate-800/50">
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{driver.name}</td>
                      <td style={{ padding: '12px' }}>{driver.phone}</td>
                      <td style={{ padding: '12px', color: driver.debt > 3000 ? '#fca5a5' : 'inherit' }}>
                        {driver.debt.toLocaleString()} 
                        {driver.debt > 3000 && <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px', color: '#ef4444' }} />}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: '#10b981', borderColor: '#10b981' }}>
                          <Wallet size={14} /> تسديد الدين (شحن)
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
