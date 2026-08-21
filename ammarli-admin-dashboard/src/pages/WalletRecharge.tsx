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
  // Driver-specific
  appCommissionDebt?: string | number;
  isSuspended?: boolean;
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
        debt: res.data.receiverDebt,
        appCommissionDebt: res.data.appCommissionDebt ?? prev.appCommissionDebt,
        isSuspended: res.data.isSuspended ?? prev.isSuspended,
      } : null);
      setAmount('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشلت عملية الشحن');
    } finally {
      setLoadingRecharge(false);
    }
  };

  const isDriver = userData?.role === 'DRIVER';
  const totalDebt = isDriver
    ? Number(userData?.debt || 0) + Number(userData?.appCommissionDebt || 0)
    : Number(userData?.debt || 0);
  const hasDebt = totalDebt > 0;

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '860px', margin: '0 auto' }}>
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
        <div className="animate-slide-up">

          {/* ── DEBT ALERT BANNER (driver only, when has debt) ── */}
          {isDriver && hasDebt && (
            <div style={{
              background: 'linear-gradient(135deg, #ff416c, #ff4b2b)',
              borderRadius: '14px',
              padding: '20px 24px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 20px rgba(255,65,108,0.35)',
            }}>
              <span style={{ fontSize: '36px' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '17px', margin: 0 }}>
                  هذا السائق عليه ديون!
                </p>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', margin: '4px 0 0' }}>
                  سيتم تخصيص مبلغ الشحن لتغطية الديون أولاً قبل إضافته للمحفظة.
                </p>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px 18px' }}>
                <p style={{ color: '#fff', fontSize: '11px', margin: '0 0 4px', opacity: 0.8 }}>إجمالي الديون</p>
                <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '22px', margin: 0 }}>
                  {totalDebt.toFixed(2)} <span style={{ fontSize: '14px' }}>د.ج</span>
                </p>
              </div>
            </div>
          )}

          {/* ── SUSPENDED BADGE ── */}
          {isDriver && userData.isSuspended && (
            <div style={{
              background: '#1a1a2e',
              border: '2px solid #e74c3c',
              borderRadius: '10px',
              padding: '12px 20px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '22px' }}>🚫</span>
              <p style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '15px', margin: 0 }}>
                السائق موقوف حالياً بسبب تجاوز الحد الأقصى للديون
              </p>
            </div>
          )}

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', borderTop: `4px solid ${hasDebt && isDriver ? '#ff416c' : '#f6d365'}` }}>
            <div className="responsive-grid-equal" style={{ alignItems: 'flex-start' }}>
              
              {/* User Details */}
              <div style={{ flex: '1 1 300px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isDriver && <span>🚛</span>}
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

                  <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '4px 0' }} />

                  {/* Wallet Balance */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>💰 الرصيد الحالي:</span>
                    <span style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '18px' }}>
                      {Number(userData.walletBalance).toFixed(2)} د.ج
                    </span>
                  </div>

                  {/* General Debt */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: Number(userData.debt) > 0 ? 'rgba(231,76,60,0.08)' : 'transparent',
                    padding: Number(userData.debt) > 0 ? '8px 12px' : '0',
                    borderRadius: '8px',
                    border: Number(userData.debt) > 0 ? '1px solid rgba(231,76,60,0.25)' : 'none',
                  }}>
                    <span style={{ color: Number(userData.debt) > 0 ? '#e74c3c' : '#555' }}>
                      🔴 الدين العام:
                    </span>
                    <span style={{ fontWeight: 'bold', color: Number(userData.debt) > 0 ? '#e74c3c' : '#27ae60', fontSize: '18px' }}>
                      {Number(userData.debt).toFixed(2)} د.ج
                    </span>
                  </div>

                  {/* Driver commission debt — only for DRIVER role */}
                  {isDriver && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: Number(userData.appCommissionDebt) > 0 ? 'rgba(231,76,60,0.08)' : 'transparent',
                      padding: Number(userData.appCommissionDebt) > 0 ? '8px 12px' : '0',
                      borderRadius: '8px',
                      border: Number(userData.appCommissionDebt) > 0 ? '1px solid rgba(231,76,60,0.25)' : 'none',
                    }}>
                      <span style={{ color: Number(userData.appCommissionDebt) > 0 ? '#e74c3c' : '#555' }}>
                        📋 دين العمولة:
                      </span>
                      <span style={{ fontWeight: 'bold', color: Number(userData.appCommissionDebt) > 0 ? '#e74c3c' : '#27ae60', fontSize: '18px' }}>
                        {Number(userData.appCommissionDebt ?? 0).toFixed(2)} د.ج
                      </span>
                    </div>
                  )}

                  {/* Total debt row for driver */}
                  {isDriver && hasDebt && (
                    <>
                      <hr style={{ border: 'none', borderTop: '1px dashed #e74c3c', margin: '0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                        <span style={{ fontWeight: 'bold', color: '#c0392b' }}>⚡ إجمالي الديون:</span>
                        <span style={{ fontWeight: 'bold', color: '#c0392b', fontSize: '20px' }}>
                          {totalDebt.toFixed(2)} د.ج
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recharge Form */}
              <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.5)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>تنفيذ عملية الشحن</h3>

                {/* Hint about debt coverage */}
                {hasDebt && (
                  <div style={{ background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#c0392b' }}>
                    💡 المبلغ المدخل سيُخصَّص لتسديد <strong>{totalDebt.toFixed(2)} د.ج</strong> ديناً أولاً.
                  </div>
                )}

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

                  {/* Preview: how much covers debt vs goes to wallet */}
                  {amount && Number(amount) > 0 && hasDebt && (
                    <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#555', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>🔴 يُسدَّد من الديون:</span>
                        <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                          -{Math.min(Number(amount), totalDebt).toFixed(2)} د.ج
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>💰 يُضاف للمحفظة:</span>
                        <span style={{ fontWeight: 'bold', color: '#27ae60' }}>
                          +{Math.max(0, Number(amount) - totalDebt).toFixed(2)} د.ج
                        </span>
                      </div>
                    </div>
                  )}

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
        </div>
      )}
    </div>
  );
}
