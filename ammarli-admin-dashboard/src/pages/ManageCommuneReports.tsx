import { useState, useEffect } from 'react';
import { DollarSign, Wallet, TrendingDown, Users } from 'lucide-react';
import api from '../api';
import geoData from '../data/geo.json';

interface CommuneReport {
  id: string;
  commune: string;
  managerName: string;
  phone: string;
  rechargedIn: number;
  rechargedOut: number;
  currentBalance: number;
}

export default function ManageCommuneReports() {
  const [reports, setReports] = useState<CommuneReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommune, setSelectedCommune] = useState('');
  const [availableCommunes, setAvailableCommunes] = useState<any[]>([]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        // 1. Fetch current user
        const userRes = await api.get('/users/me');
        const wilaya = userRes.data.managedWilaya || '';

        // 2. Determine communes to show in dropdown
        if (wilaya) {
          let extractedWilaya = wilaya.toString().trim();
          if (extractedWilaya.includes('-')) {
            extractedWilaya = extractedWilaya.split('-')[1].trim();
          }
          const wilayaStr = extractedWilaya.toLowerCase();
          
          const wilayaData = geoData.wilayas.find((w: any) => 
            w.name_fr?.toString().trim().toLowerCase() === wilayaStr || 
            w.name_ar?.toString().trim() === extractedWilaya
          );
          if (wilayaData) {
            const communesForWilaya = geoData.communes.filter((c: any) => 
              String(c.wilaya_code) === String(wilayaData.code)
            );
            setAvailableCommunes(communesForWilaya);
          }
        }

        // 3. Fetch reports
        const wilayaQuery = wilaya ? `&wilaya=${encodeURIComponent(wilaya.toString())}` : '';
        const reportsRes = await api.get(`/statistics/report?name=commune_managers${wilayaQuery}`);
        
        // Ensure reports is always an array
        const fetchedReports = Array.isArray(reportsRes.data) ? reportsRes.data : [];
        setReports(fetchedReports);

      } catch (err) {
        console.error('Failed to initialize reports page', err);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  const filteredReports = selectedCommune 
    ? reports.filter(r => r.commune === selectedCommune)
    : reports;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div className="flex items-center gap-4 glass-panel animate-fade-in" style={{ padding: '16px 24px', flex: '1 1 300px' }}>
          <div style={{ background: 'var(--accent-color)', padding: '8px', borderRadius: '8px' }}>
            <Users size={24} color="white" />
          </div>
          <h2 style={{ margin: 0 }}>التقارير المالية للبلديات</h2>
        </div>

        {availableCommunes.length > 0 && (
          <div className="glass-panel animate-fade-in" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', flex: '1 1 300px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>تصفية حسب البلدية:</span>
            <select 
              className="input-glass" 
              style={{ width: '200px', padding: '8px 16px' }}
              value={selectedCommune}
              onChange={(e) => setSelectedCommune(e.target.value)}
            >
              <option value="">جميع البلديات</option>
              {availableCommunes.map((c: any) => (
                <option key={c.code_commune || c.name_ar} value={c.name_ar}>{c.name_ar}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>تفصيل الكاش حسب مدير البلدية</h3>
        
        <div className="table-responsive">
          <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px' }}>البلدية</th>
                <th style={{ padding: '12px' }}>اسم المدير</th>
                <th style={{ padding: '12px' }}>إجمالي المستلم (الكاش الداخل)</th>
                <th style={{ padding: '12px' }}>إجمالي المُشحن للسائقين</th>
                <th style={{ padding: '12px' }}>الكاش المتوفر (المحفظة)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>جاري التحميل...</td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد مدراء بلديات</td>
                </tr>
              ) : (
                filteredReports.map((report, idx) => (
                  <tr key={report.id || idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 8px', borderRadius: '4px' }}>
                        {report.commune}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{report.managerName}<br/><span style={{fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal'}}>{report.phone}</span></td>
                    <td style={{ padding: '12px', color: 'var(--success-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={16} />
                        {report.rechargedIn.toLocaleString()} د.ج
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#f59e0b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingDown size={16} />
                        {report.rechargedOut.toLocaleString()} د.ج
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                        <Wallet size={16} />
                        {report.currentBalance.toLocaleString()} د.ج
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
