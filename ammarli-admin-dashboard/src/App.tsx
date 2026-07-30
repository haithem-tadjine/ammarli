import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import AgentRecharge from './pages/AgentRecharge.tsx';
import ManageWilaya from './pages/ManageWilaya.tsx';
import ManageCommune from './pages/ManageCommune.tsx';
import ManageAgents from './pages/ManageAgents.tsx';
import ManageCommuneDrivers from './pages/ManageCommuneDrivers.tsx';
import ManageAllDrivers from './pages/ManageAllDrivers.tsx';
import FinancialReports from './pages/FinancialReports.tsx';
import Settings from './pages/Settings.tsx';
import WalletRecharge from './pages/WalletRecharge.tsx';
import ManageCommuneReports from './pages/ManageCommuneReports.tsx';
import Layout from './components/Layout.tsx';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <ToastContainer position="top-center" autoClose={3000} />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
            {/* Super Admin Routes */}
            <Route path="/super-admin" element={<Dashboard />} />
            <Route path="/super-admin/wilayas" element={<ManageWilaya />} />
            <Route path="/super-admin/drivers" element={<ManageAllDrivers />} />
            <Route path="/super-admin/financials" element={<FinancialReports />} />
            <Route path="/super-admin/settings" element={<Settings />} />

            {/* Commune Manager Routes */}
            <Route path="/commune" element={<Dashboard />} />
            <Route path="/commune/agents" element={<ManageAgents />} />
            <Route path="/commune/drivers" element={<ManageCommuneDrivers />} />

            {/* Wilaya Manager Routes */}
            <Route path="/wilaya/communes" element={<ManageCommune />} />
            <Route path="/wilaya/agents" element={<ManageAgents />} />
            <Route path="/wilaya/commune-reports" element={<ManageCommuneReports />} />



            {/* Agent Routes */}
            <Route path="/agent/recharge" element={<AgentRecharge />} />
            
            {/* Wallet Recharge Route (Shared) */}
            <Route path="/wallet-recharge" element={<WalletRecharge />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
