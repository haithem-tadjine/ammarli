import { useState, useEffect } from 'react';
import { FileText, TrendingUp, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, Droplet, Truck, Package } from 'lucide-react';
import api from '../api';
import geoData from '../data/geo.json';

export default function FinancialReports() {
  const [timeframe, setTimeframe] = useState('month');
  const [selectedWilaya, setSelectedWilaya] = useState('all');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // The API base is /api/v1, so we just call /statistics/dashboard
      const wilayaQuery = selectedWilaya !== 'all' ? `?wilaya=${encodeURIComponent(selectedWilaya)}` : '';
      const res = await api.get(`/statistics/dashboard${wilayaQuery}`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeframe, selectedWilaya]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div className="flex items-center gap-4 glass-panel animate-fade-in" style={{ padding: '16px 24px', flex: '1 1 300px' }}>
          <div style={{ background: 'var(--success-color)', padding: '8px', borderRadius: '8px' }}>
            <FileText size={24} color="white" />
          </div>
          <h2 style={{ margin: 0 }}>التقارير المالية المفصلة</h2>
        </div>

        <div className="glass-panel animate-fade-in" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', flex: '1 1 300px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>تصفية حسب الولاية:</span>
          <select 
            className="input-glass" 
            style={{ flex: 1, minWidth: '200px', padding: '8px 16px' }}
            value={selectedWilaya}
            onChange={(e) => setSelectedWilaya(e.target.value)}
          >
            <option value="all">جميع الولايات (الوطن)</option>
            {geoData.map((w: any) => (
              <option key={w.code} value={w.name_ar}>{w.code} - {w.name_ar}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="responsive-grid-equal animate-fade-in" style={{ marginBottom: '24px' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', animationDelay: '0.1s' }}>
          <div className="flex justify-between items-center text-slate-400">
            <span>إجمالي الكاش المتواجد (عمليات الشحن)</span>
            <DollarSign size={20} />
          </div>
          <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--success-color)' }}>
            {loading ? '...' : `${(stats?.revenue?.totalCash || 0).toLocaleString()} د.ج`}
          </h2>
          <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} /> إجمالي المبالغ المشحونة للسائقين
          </span>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', animationDelay: '0.2s' }}>
          <div className="flex justify-between items-center text-slate-400">
            <span>أرباح المنصة الفِعلية</span>
            <TrendingUp size={20} />
          </div>
          <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--accent-color)' }}>
            {loading ? '...' : `${(stats?.revenue?.totalPlatformProfit || 0).toLocaleString()} د.ج`}
          </h2>
          <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} /> بناءً على العمولات المحصلة
          </span>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', animationDelay: '0.3s' }}>
          <div className="flex justify-between items-center text-slate-400">
            <span>إجمالي الطلبات الناجحة</span>
            <Calendar size={20} />
          </div>
          <h2 style={{ margin: 0, fontSize: '28px', color: '#f59e0b' }}>
            {loading ? '...' : `${(stats?.orders?.byStatus?.DELIVERED || 0).toLocaleString()} طلب`}
          </h2>
          <span style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowDownRight size={14} /> عدد الطلبات المكتملة
          </span>
        </div>
      </div>

      {/* Product Specific Reports */}
      <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.35s', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>تقارير المبيعات حسب نوع الخدمة</h3>
        <div className="responsive-grid-equal">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
            <div className="flex justify-between items-center text-blue-400">
              <span>مياه الينابيع</span>
              <Droplet size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>
              {loading ? '...' : (stats?.products?.springLiters || 0).toLocaleString()} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>لتر</span>
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>إجمالي اللترات المُباعة</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px' }}>
            <div className="flex justify-between items-center text-amber-400">
              <span>مياه الصهاريج (الآبار والأشغال)</span>
              <Truck size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>
              {loading ? '...' : (stats?.products?.wellTrips || 0).toLocaleString()} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>رحلة</span>
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>إجمالي الرحلات المنجزة</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
            <div className="flex justify-between items-center text-emerald-400">
              <span>مياه القوارير</span>
              <Package size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>
              {loading ? '...' : (stats?.products?.bottledFardeaus || 0).toLocaleString()} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>فاردو</span>
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>إجمالي الفاردوات المُباعة</span>
          </div>

        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.4s', minHeight: '400px' }}>
        <div className="flex justify-between items-center mb-6">
          <h3 style={{ margin: 0 }}>المداخيل حسب الولاية</h3>
          <select 
            className="input-glass" 
            style={{ width: 'auto', padding: '8px 16px' }}
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="year">هذا العام</option>
          </select>
        </div>

        {/* Dynamic Chart Area */}
        <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--glass-border)' }}>
          {loading ? (
            <div style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)'}}>جاري التحميل...</div>
          ) : stats?.revenue?.rechargeByWilaya?.length > 0 ? (
            stats.revenue.rechargeByWilaya.map((item: any, i: number) => {
              const maxAmount = Math.max(...stats.revenue.rechargeByWilaya.map((w: any) => w.amount));
              const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
              
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{item.amount.toLocaleString()} د.ج</span>
                  <div style={{ 
                    width: '100%', 
                    height: `${Math.max(height, 10)}%`, 
                    background: `linear-gradient(to top, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.8))`,
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 1s ease-out'
                  }}></div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    {item.wilaya}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)'}}>لا توجد بيانات متاحة</div>
          )}
        </div>
      </div>
    </div>
  );
}
