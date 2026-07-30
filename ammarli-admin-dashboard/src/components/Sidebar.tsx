import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { 
  BarChart3, Users, Settings, LogOut, Wallet, 
  Map, ShieldAlert, FileText, ChevronRight, Menu, LayoutDashboard, UserPlus, PieChart, X
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const [role, setRole] = useState<string>('SUPER_ADMIN');
  const [collapsed, setCollapsed] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedRole = localStorage.getItem('user_role');
    if (savedRole) {
      setRole(savedRole);
    }
    fetchBalance();
  }, [location.pathname]);

  const fetchBalance = async () => {
    try {
      const res = await api.get('/wallet/my-balance');
      setBalance(Number(res.data.walletBalance));
    } catch (err) {
      console.error('Failed to fetch balance', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const menuItems = {
    SUPER_ADMIN: [
      { path: '/super-admin', icon: BarChart3, label: 'لوحة القيادة والمؤشرات' },
      { path: '/super-admin/wilayas', icon: Map, label: 'إدارة مدراء الولايات' },
      { path: '/super-admin/drivers', icon: PieChart, label: 'تقرير مستخدمي التطبيق' },
      { path: '/super-admin/financials', icon: FileText, label: 'التقارير المالية' },
      { path: '/wilaya/commune-reports', icon: FileText, label: 'التقارير المالية للبلديات' },
      { path: '/wallet-recharge', icon: Wallet, label: 'شحن المحافظ' },
      { path: '/super-admin/settings', icon: Settings, label: 'إعدادات النظام' },
    ],
    WILAYA_MANAGER: [
      { path: '/wilaya/communes', icon: Map, label: 'تعيين مدراء البلديات' },
      { path: '/wilaya/agents', icon: ShieldAlert, label: 'تعيين وكلاء (كاشير)' },
      { path: '/wilaya/commune-reports', icon: FileText, label: 'التقارير المالية للبلديات' },
      { path: '/wallet-recharge', icon: Wallet, label: 'شحن المحافظ' },
    ],
    COMMUNE_MANAGER: [
      { path: '/commune', label: 'لوحة القيادة', icon: LayoutDashboard },
      { path: '/commune/agents', label: 'إدارة الوكلاء', icon: UserPlus },
      { path: '/commune/drivers', label: 'سائقي البلدية', icon: Users },
      { path: '/wallet-recharge', icon: Wallet, label: 'شحن المحافظ' },
    ],
    AGENT: [
      { path: '/wallet-recharge', icon: Wallet, label: 'شحن رصيد السائقين' },
    ]
  };

  const links = menuItems[role as keyof typeof menuItems] || menuItems['SUPER_ADMIN'];

  return (
    <>
      <div 
        className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`} 
        onClick={onMobileClose}
      />
      <div className={`sidebar glass-panel ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`} style={{
        width: collapsed ? '80px' : '260px',
        height: '100vh',
        borderRadius: '0',
        borderRight: '1px solid var(--glass-border)',
        borderTop: 'none',
        borderBottom: 'none',
        borderLeft: 'none',
        position: 'fixed',
        right: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease, transform 0.3s ease',
        zIndex: 100
      }}>
        <div className="flex items-center justify-between" style={{ padding: '24px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {!collapsed && <h2 style={{ margin: 0, color: 'var(--accent-color)' }}>عمارلي</h2>}
          <button 
            onClick={() => {
              if (window.innerWidth <= 768 && onMobileClose) {
                onMobileClose();
              } else {
                setCollapsed(!collapsed);
              }
            }} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-sidebar)', cursor: 'pointer' }}
          >
            {window.innerWidth <= 768 ? <X size={24} /> : (collapsed ? <Menu size={24} /> : <ChevronRight size={24} />)}
          </button>
        </div>

        {!collapsed && balance !== null && (
          <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-sidebar)', marginBottom: '4px' }}>الرصيد المتاح</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1c40f' }} dir="ltr">
              {role === 'SUPER_ADMIN' ? '∞' : `${balance.toFixed(2)} د.ج`}
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || location.pathname.startsWith(link.path + '/');
            return (
              <NavLink 
                key={link.path} 
                to={link.path}
                onClick={() => {
                  if (window.innerWidth <= 768 && onMobileClose) {
                    onMobileClose();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-sidebar)',
                  background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderRight: isActive ? '4px solid var(--accent-color)' : '4px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={20} color={isActive ? 'var(--accent-color)' : 'var(--text-sidebar)'} />
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            onClick={handleLogout}
            className="btn-danger w-full flex items-center justify-center gap-2"
            style={{ padding: collapsed ? '12px' : '12px 24px' }}
          >
            <LogOut size={16} />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </div>
    </>
  );
}
