import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function Layout() {
  const role = localStorage.getItem('user_role');
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!role && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100dvh', direction: 'rtl' }}>
      <div className="mobile-header">
        <h2 style={{ margin: 0, color: 'var(--accent-color)', fontSize: '1.2rem' }}>عمارلي</h2>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          style={{ 
            background: 'var(--accent-color)', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold'
          }}
        >
          <span>القائمة</span>
          <Menu size={20} />
        </button>
      </div>

      <Sidebar 
        isMobileOpen={isMobileMenuOpen} 
        onMobileClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
