import { useState } from 'react';
import api from '../api';
import { toast } from 'react-toastify';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  walletBalance: string | number;
  debt: string | number;
}

export default function WalletRecharge() {
  const [phone, setPhone] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [amount, setAmount] = useState('');
  const [loadingRecharge, setLoadingRecharge] = useState(false);

  const roleMap: Record<string, string> = {
    SUPER_ADMIN: 'مدير عام',
    WILAYA_MANAGER: 'مدير ولائي',
    COMMUNE_MANAGER: 'مدير بلدي',
    AGENT: 'وكيل (كاشير)',
    DRIVER: 'سائق',
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    setLoadingSearch(true);
    setUserData(null);
    try {
      const res = await api.get(`/wallet/user/${encodeURIComponent(phone)}`);
      setUserData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'لم يتم العثور على المستخدم');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !amount || Number(amount) <= 0) return;

    if (!window.confirm(`هل أنت متأكد من شحن ${amount} دج للمستخدم ${userData.firstName} ${userData.lastName}؟`)) {
      return;
    }

    setLoadingRecharge(true);
    try {
      const res = await api.post('/wallet/recharge', {
        receiverId: userData.id,
        amount: Number(amount),
      });
      
      toast.success('تمت عملية الشحن بنجاح!');
      // Update local state with new balances from response
      setUserData(prev => prev ? {
        ...prev,
        walletBalance: res.data.receiverBalance,
        debt: res.data.receiverDebt
      } : null);
      setAmount('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشلت عملية الشحن');
    } finally {
      setLoadingRecharge(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>شحن المحافظ 💰</h1>
      </div>

      {/* Search Section */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#555' }}>البحث عن مستخدم</h2>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            className="input-glass"
            placeholder="أدخل رقم الهاتف (مثال: 0555123456)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', fontSize: '16px' }}
            required
          />
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loadingSearch}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}
          >
            {loadingSearch ? 'جاري البحث...' : 'بحث 🔍'}
          </button>
        </form>
      </div>

      {/* User Info & Recharge Section */}
      {userData && (
        <div className="glass-panel animate-slide-up" style={{ padding: '24px', borderRadius: '16px', borderTop: '4px solid #f6d365' }}>
          <div className="responsive-grid-equal" style={{ alignItems: 'flex-start' }}>
            
            {/* User Details */}
            <div style={{ flex: '1 1 300px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
                {userData.firstName} {userData.lastName}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#555' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>رقم الهاتف:</span>
                  <span style={{ fontWeight: 'bold' }} dir="ltr">{userData.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الدور:</span>
                  <span style={{ fontWeight: 'bold', background: '#eee', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                    {roleMap[userData.role] || userData.role}
                  </span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الرصيد الحالي:</span>
                  <span style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '18px' }}>
                    {Number(userData.walletBalance).toFixed(2)} د.ج
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>الدين (السالب):</span>
                  <span style={{ fontWeight: 'bold', color: '#e74c3c', fontSize: '18px' }}>
                    {Number(userData.debt).toFixed(2)} د.ج
                  </span>
                </div>
              </div>
            </div>

            {/* Recharge Form */}
            <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.5)', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>تنفيذ عملية الشحن</h3>
              <form onSubmit={handleRecharge} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontSize: '14px' }}>المبلغ (دينار جزائري)</label>
                  <input
                    type="number"
                    className="input-glass"
                    placeholder="مثال: 2000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '18px', textAlign: 'left' }}
                    dir="ltr"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loadingRecharge || !amount}
                  style={{ padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', marginTop: '8px' }}
                >
                  {loadingRecharge ? 'جاري الشحن...' : 'تأكيد الشحن 💳'}
                </button>
              </form>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
