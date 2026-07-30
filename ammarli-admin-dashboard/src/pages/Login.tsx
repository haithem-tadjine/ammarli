import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';


export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Real API call
      const response = await api.post('/auth/phone/login', {
        phone,
        password
      });

      const { accessToken, user } = response.data;
      
      // Save token and role
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('user_role', user.role);

      // Redirect based on role
      if (user.role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else if (user.role === 'WILAYA_MANAGER') {
        navigate('/wilaya/communes');
      } else if (user.role === 'COMMUNE_MANAGER') {
        navigate('/commune/agents');
      } else {
        navigate('/agent/recharge');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'فشل تسجيل الدخول. تأكد من الرقم وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center" style={{ minHeight: '100dvh', justifyContent: 'center', background: '#DCEBFC', padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '360px', padding: '40px 32px', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
        
        <h1 style={{ color: 'var(--accent-color)', fontSize: '36px', fontWeight: 'bold', margin: '0 0 40px 0', fontFamily: 'serif' }}>
          Ammarli
        </h1>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input 
            type="text" 
            className="input-glass" 
            placeholder="اسم المستخدم" 
            style={{ padding: '16px', borderRadius: '30px', textAlign: 'center', fontSize: '16px' }}
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />

          <input 
            type="password" 
            className="input-glass" 
            placeholder="كلمة المرور" 
            style={{ padding: '16px', borderRadius: '12px', fontSize: '16px' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '16px', borderRadius: '30px', fontSize: '18px', marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        {error && <div style={{ color: 'var(--danger-color)', marginTop: '16px', fontSize: '14px' }}>{error}</div>}

        <a href="#" style={{ display: 'inline-block', marginTop: '24px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>
          هل نسيت كلمة المرور؟
        </a>
      </div>
    </div>
  );
}
