import { useState, useEffect } from 'react';
import { Search, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';

export default function AgentRecharge() {
  const [searchPhone, setSearchPhone] = useState('');
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [myBalance, setMyBalance] = useState<number>(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Fetch Agent's current balance
    api.get('/wallet/my-balance')
      .then(res => setMyBalance(res.data.walletBalance))
      .catch(err => console.error(err));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDriver(null);
    try {
      const res = await api.get(`/wallet/user/${encodeURIComponent(searchPhone)}`);
      setDriver({
        id: res.data.id,
        name: `${res.data.firstName} ${res.data.lastName}`,
        phone: res.data.phone,
        debt: res.data.debt || 0,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'لم يتم العثور على السائق بهذا الرقم');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!driver || driver.debt <= 0) return;
    
    if (myBalance < driver.debt) {
      toast.error('رصيدك غير كافٍ لتسديد هذا الدين');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/wallet/recharge', {
        receiverId: driver.id,
        amount: driver.debt,
      });
      toast.success('تم تسديد الدين وتصفير الرصيد بنجاح! السائق عاد للعمل.');
      setDriver((prev: any) => ({ ...prev, debt: 0 }));
      setMyBalance(prev => prev - driver.debt);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشلت عملية الدفع');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
      {/* Dark Blue Header */}
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '40px 24px 60px', textAlign: 'center', borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px', position: 'relative', zIndex: 1 }}>
        <h1 style={{ color: 'var(--accent-color)', margin: '0 0 16px 0', fontFamily: 'serif' }}>Ammarli</h1>
        <p style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.8 }}>الرصيد الحالي</p>
        <h2 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '32px' }}>{myBalance.toLocaleString()} د.ج</h2>
      </div>

      {/* White Content Area */}
      <div style={{ padding: '24px', background: 'var(--bg-secondary)', marginTop: '-30px', zIndex: 2, position: 'relative', borderRadius: '30px 30px 0 0' }}>
        <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: '24px' }}>
          <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="ابحث عن سائق..." 
            value={searchPhone}
            onChange={e => setSearchPhone(e.target.value)}
            required
            style={{ width: '100%', padding: '16px 48px 16px 16px', borderRadius: '30px', border: '1px solid var(--border-color)', background: '#F3F4F6', outline: 'none', boxSizing: 'border-box' }}
          />
        </form>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>جاري البحث...</div>
        ) : driver ? (
          <div className="animate-fade-in">
            <div style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <div style={{ width: '60px', height: '60px', background: '#E5E7EB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={32} color="#9CA3AF" />
              </div>
              <h3 style={{ margin: 0 }}>{driver.name}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Driver ID: {driver.id.split('-')[1] || '0010001'}</p>
              
              <div style={{ background: driver.debt > 0 ? 'var(--danger-color)' : 'var(--success-color)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', marginTop: '8px' }}>
                {driver.debt > 0 ? `الدين المستحق: ${driver.debt} د.ج` : 'لا يوجد دين مستحق'}
              </div>
            </div>

            {driver.debt > 0 && (
              <button 
                onClick={handleRecharge}
                disabled={processing}
                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: processing ? 'gray' : 'var(--success-color)', color: 'white', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: processing ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}
              >
                <CheckCircle2 size={24} /> {processing ? 'جاري الدفع...' : 'تأكيد الدفع'}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
