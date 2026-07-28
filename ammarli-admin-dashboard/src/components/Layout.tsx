import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const role = localStorage.getItem('user_role');
  const location = useLocation();

  if (!role && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', direction: 'rtl' }}>
      <Sidebar />
      <main style={{ 
        flex: 1, 
        padding: '24px',
        marginRight: '260px', // Space for Sidebar
        transition: 'margin-right 0.3s ease',
        overflowY: 'auto'
      }}>
        <Outlet />
      </main>
    </div>
  );
}
