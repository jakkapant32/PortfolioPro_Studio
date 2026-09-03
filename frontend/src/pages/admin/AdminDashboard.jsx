import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRequireAdmin, ORDER_STATUS_LABELS, formatDate } from '../../hooks/useRequireAdmin';
import { getDashboard } from '../../api/admin';
import AdminIcon from '../../components/admin/AdminIcon';

function formatMoney(n) {
  return `฿${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatMonthLabel(month) {
  const [year, m] = month.split('-');
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${months[Number(m) - 1]} ${year}`;
}

function formatShortDate(d = new Date()) {
  return d.toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function revenueTrend(current, previous) {
  if (!previous || previous <= 0) {
    if (current > 0) return { label: 'เดือนนี้มีรายรับ', up: true, pct: null };
    return { label: 'ยังไม่มีรายรับ', up: null, pct: 0 };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return { label: `${pct >= 0 ? '+' : ''}${pct}% จากเดือนก่อน`, up: pct >= 0, pct };
}

function KpiCard({ icon, label, value, sub, trend, accent, to }) {
  const inner = (
    <div className={`dash-kpi dash-kpi--${accent}`}>
      <div className="dash-kpi-icon"><AdminIcon name={icon} /></div>
      <div className="dash-kpi-body">
        <span className="dash-kpi-label">{label}</span>
        <span className="dash-kpi-value">{value}</span>
        {sub && <span className="dash-kpi-sub">{sub}</span>}
        {trend && (
          <span className={`dash-kpi-trend ${trend.up === true ? 'up' : trend.up === false ? 'down' : ''}`}>
            {trend.label}
          </span>
        )}
      </div>
    </div>
  );
  if (to) return <Link to={to} className="dash-kpi-link">{inner}</Link>;
  return inner;
}

function PipelineStep({ label, count, to, tone }) {
  return (
    <Link to={to} className={`dash-pipeline-step dash-pipeline-step--${tone}`}>
      <span className="dash-pipeline-count">{count}</span>
      <span className="dash-pipeline-label">{label}</span>
    </Link>
  );
}

function QuickAction({ to, icon, label, desc }) {
  return (
    <Link to={to} className="dash-quick-action">
      <span className="dash-quick-icon"><AdminIcon name={icon} /></span>
      <span className="dash-quick-text">
        <strong>{label}</strong>
        <small>{desc}</small>
      </span>
      <AdminIcon name="arrow-right" />
    </Link>
  );
}

export default function AdminDashboard() {
  const { user, token, loading: authLoading } = useRequireAdmin();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!token) return Promise.resolve();
    return getDashboard(token)
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await load();
    setRefreshing(false);
  };

  if (authLoading) return <div className="admin-loading">กำลังโหลด...</div>;
  if (error && !stats) return <div className="form-error">{error}</div>;
  if (!stats) return <div className="admin-loading">กำลังโหลดข้อมูล...</div>;

  const pipeline = stats.pipeline || {};
  const maxRevenue = Math.max(...(stats.monthly_revenue || []).map((m) => m.revenue), 1);
  const trend = revenueTrend(stats.revenue_this_month, stats.revenue_last_month);
  const leadsNew = (stats.contacts_new || 0) + (stats.quotations_new || 0);
  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const topPkgMax = Math.max(...(stats.top_packages || []).map((p) => p.count), 1);

  const pipelineSteps = [
    { label: 'ร่างสัญญา', count: pipeline.projects_pending_contract || 0, tone: 'slate' },
    { label: 'รอเซ็นสัญญา', count: pipeline.projects_await_accept || 0, tone: 'amber' },
    { label: 'กำลังทำงาน', count: pipeline.projects_in_progress || 0, tone: 'blue' },
    { label: 'รอรับงาน', count: pipeline.projects_await_receive || 0, tone: 'violet' },
    { label: 'ค้างชำระ', count: pipeline.orders_balance_due || 0, tone: 'rose' },
  ];

  return (
    <div className="admin-page dash-page">
      <header className="dash-header">
        <div>
          <p className="dash-greeting">สวัสดี, {firstName}</p>
          <h1>Dashboard</h1>
          <p className="dash-date">{formatShortDate()}</p>
        </div>
        <div className="dash-header-actions">
          <Link to="/admin/reports" className="dash-refresh-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            รายงาน →
          </Link>
          <button type="button" className="dash-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'กำลังอัปเดต...' : 'รีเฟรชข้อมูล'}
          </button>
          <Link to="/" className="dash-view-site" target="_blank" rel="noreferrer">
            ดูเว็บไซต์ ↗
          </Link>
        </div>
      </header>

      {error && <p className="form-error dash-inline-error">{error}</p>}

      <section className="dash-kpi-grid">
        <KpiCard
          icon="chart"
          accent="primary"
          label="รายรับเดือนนี้"
          value={formatMoney(stats.revenue_this_month)}
          sub={`รวมทั้งหมด ${formatMoney(stats.revenue_total)}`}
          trend={trend}
          to="/admin/orders"
        />
        <KpiCard
          icon="credit-card"
          accent="emerald"
          label="คำสั่งซื้อ"
          value={stats.orders_this_month ?? 0}
          sub={`สำเร็จ ${stats.orders_successful} · รอดำเนินการ ${stats.orders_pending}`}
          to="/admin/orders"
        />
        <KpiCard
          icon="briefcase"
          accent="violet"
          label="งานที่ต้องทำ"
          value={stats.pipeline_action_total ?? 0}
          sub={`โปรเจกตทั้งหมด ${pipeline.projects_total || 0}`}
          to="/admin/orders"
        />
        <KpiCard
          icon="mail"
          accent="amber"
          label="ลีดใหม่"
          value={leadsNew}
          sub={`ติดต่อ ${stats.contacts_new} · ใบเสนอราคา ${stats.quotations_new}`}
          to="/admin/contacts"
        />
      </section>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>ทางลัด</h2>
          <p>งานที่ทำบ่อยในระบบหลังบ้าน</p>
        </div>
        <div className="dash-quick-grid">
          <QuickAction to="/admin/orders" icon="briefcase" label="คำสั่งซื้อและส่งมอบ" desc="สลิป · สัญญา · ส่งมอบงาน" />
          <QuickAction to="/admin/contacts" icon="mail" label="ข้อความติดต่อ" desc="ตอบลูกค้าใหม่" />
          <QuickAction to="/admin/portfolio" icon="layout" label="แพ็กเกจบริการ" desc="แก้ไขราคาและรายละเอียด" />
        </div>
      </section>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Pipeline งานลูกค้า</h2>
          <p>ขั้นตอนส่งมอบบริการตั้งแต่ชำระเงินจนปิดงาน</p>
        </div>
        <div className="dash-pipeline">
          {pipelineSteps.map((step, i) => (
            <PipelineStep key={step.label} {...step} to="/admin/orders" />
          ))}
        </div>
        {(pipeline.projects_total || 0) === 0 && (
          <p className="dash-empty-hint">ยังไม่มีโปรเจกต — จะถูกสร้างอัตโนมัติเมื่อแอดมินยืนยันสลิปโอนเงิน</p>
        )}
      </section>

      <div className="dash-main-grid">
        <section className="dash-panel dash-panel--wide">
          <div className="dash-panel-head">
            <h2>รายได้ 6 เดือนย้อนหลัง</h2>
            <span className="dash-panel-meta">จากออเดอร์ชำระแล้ว</span>
          </div>
          {(stats.monthly_revenue || []).length === 0 ? (
            <p className="admin-panel-empty">ยังไม่มีข้อมูลรายได้</p>
          ) : (
            <div className="dash-bar-chart">
              {stats.monthly_revenue.map((row) => {
                const h = Math.max((row.revenue / maxRevenue) * 100, row.revenue > 0 ? 8 : 0);
                return (
                  <div key={row.month} className="dash-bar-col" title={formatMoney(row.revenue)}>
                    <div className="dash-bar-track">
                      <div className="dash-bar-fill" style={{ height: `${h}%` }} />
                    </div>
                    <span className="dash-bar-amount">{row.revenue > 0 ? formatMoney(row.revenue) : '—'}</span>
                    <span className="dash-bar-label">{formatMonthLabel(row.month)}</span>
                    <span className="dash-bar-orders">{row.orders} ออเดอร์</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>แพ็กเกจขายดี</h2>
            <Link to="/admin/portfolio" className="dash-panel-link">จัดการ →</Link>
          </div>
          {(stats.top_packages || []).length === 0 ? (
            <p className="admin-panel-empty">ยังไม่มีข้อมูลยอดขาย</p>
          ) : (
            <ul className="dash-rank-list">
              {stats.top_packages.map((pkg, i) => (
                <li key={pkg.id} className="dash-rank-item">
                  <span className="dash-rank-num">{i + 1}</span>
                  <div className="dash-rank-body">
                    <span className="dash-rank-title">{pkg.title}</span>
                    <div className="dash-rank-bar-wrap">
                      <div className="dash-rank-bar" style={{ width: `${(pkg.count / topPkgMax) * 100}%` }} />
                    </div>
                    <span className="dash-rank-meta">{pkg.count} ครั้ง · {formatMoney(pkg.revenue)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dash-main-grid">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>คำสั่งซื้อล่าสุด</h2>
            <Link to="/admin/orders" className="dash-panel-link">ดูทั้งหมด →</Link>
          </div>
          {(stats.recent_orders || []).length === 0 ? (
            <p className="admin-panel-empty">ยังไม่มีคำสั่งซื้อ</p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ลูกค้า / บริการ</th>
                    <th>ยอด</th>
                    <th>สถานะ</th>
                    <th>วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_orders.map((row) => (
                    <tr key={row.id}>
                      <td><Link to="/admin/orders" className="dash-order-id">{row.id}</Link></td>
                      <td>
                        <span className="dash-cell-primary">{row.customer_name || row.customer_email}</span>
                        <span className="dash-cell-secondary">{row.title}</span>
                      </td>
                      <td>{formatMoney(row.total)}</td>
                      <td>
                        <span className={`admin-badge status-${row.status}`}>
                          {ORDER_STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                      <td className="dash-cell-date">{formatDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>ต้องติดตาม</h2>
            <span className="dash-panel-meta">ลีดและข้อความใหม่</span>
          </div>
          {(stats.recent_contacts || []).length === 0 && (stats.recent_quotations || []).length === 0 ? (
            <div className="dash-all-clear">
              <AdminIcon name="check" />
              <p>ไม่มีรายการค้าง — ทุกอย่างเรียบร้อย</p>
            </div>
          ) : (
            <ul className="dash-attention-list">
              {(stats.recent_contacts || []).map((c) => (
                <li key={`c-${c.id}`}>
                  <Link to="/admin/contacts" className="dash-attention-item">
                    <span className="dash-attention-badge contact">ติดต่อ</span>
                    <span className="dash-attention-name">{c.name}</span>
                    <span className="dash-attention-detail">{c.service || c.email}</span>
                    <span className="dash-attention-time">{formatDate(c.created_at)}</span>
                  </Link>
                </li>
              ))}
              {(stats.recent_quotations || []).map((q) => (
                <li key={`q-${q.id}`}>
                  <Link to="/admin/quotations" className="dash-attention-item">
                    <span className="dash-attention-badge quote">ใบเสนอราคา</span>
                    <span className="dash-attention-name">{q.name}</span>
                    <span className="dash-attention-detail">
                      {q.service || q.email}
                      {q.total > 0 ? ` · ${formatMoney(q.total)}` : ''}
                    </span>
                    <span className="dash-attention-time">{formatDate(q.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="dash-stats-row">
            <div className="dash-mini-stat">
              <span>สมาชิกทั้งหมด</span>
              <strong>{stats.users_total}</strong>
            </div>
            <div className="dash-mini-stat">
              <span>ติดต่อทั้งหมด</span>
              <strong>{stats.contacts_total}</strong>
            </div>
            <div className="dash-mini-stat">
              <span>ใบเสนอราคา</span>
              <strong>{stats.quotations_total}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
