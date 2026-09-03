import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRequireAdmin, ORDER_STATUS_LABELS } from '../../hooks/useRequireAdmin';
import { getReports } from '../../api/admin';
import { downloadCsv } from '../../utils/exportCsv';
import AdminIcon from '../../components/admin/AdminIcon';
import { isGaConfigured, isClarityConfigured, getGaDashboardUrl, getClarityDashboardUrl } from '../../components/Analytics';

function fmtMoney(n) {
  return `฿${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function toDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthStart() {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 1));
}

function todayInput() {
  return toDateInput(new Date());
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateInput(d);
}

const PAYMENT_LABELS = {
  bank_transfer: 'โอนเงินแนบสลิป',
  promptpay: 'พร้อมเพย์',
  unknown: 'ไม่ระบุ',
};

const SEGMENT_COLORS = {
  VIP: 'vip',
  'ลูกค้าประจำ': 'loyal',
  'ลูกค้าใหม่': 'new',
  Active: 'active',
  'เสี่ยงหลุด': 'risk',
  'หายไป': 'lost',
};

const PRESETS = [
  { label: 'เดือนนี้', from: monthStart, to: todayInput },
  { label: '7 วัน', from: () => daysAgo(6), to: todayInput },
  { label: '30 วัน', from: () => daysAgo(29), to: todayInput },
  { label: '90 วัน', from: () => daysAgo(89), to: todayInput },
];

function FunnelBar({ label, count, max, color }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="rpt-funnel-row">
      <span className="rpt-funnel-label">{label}</span>
      <div className="rpt-funnel-track">
        <div className={`rpt-funnel-fill rpt-funnel-fill--${color}`} style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }} />
      </div>
      <span className="rpt-funnel-count">{count}</span>
    </div>
  );
}

export default function AdminReports() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayInput());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!token) return Promise.resolve();
    setLoading(true);
    setError(null);
    return getReports(token, { from, to })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, from, to]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (preset) => {
    setFrom(preset.from());
    setTo(preset.to());
  };

  const exportSalesCsv = () => {
    if (!data) return;
    const rows = [
      ['รายงานยอดขาย PortfolioPro Studio'],
      ['จาก', data.from, 'ถึง', data.to],
      [],
      ['สรุป', ''],
      ['รายรับที่เก็บได้', data.summary?.revenue_collected],
      ['ออเดอร์ที่สร้าง', data.summary?.orders_created],
      ['ออเดอร์ที่ชำระแล้ว', data.summary?.orders_paid],
      ['ยอดเฉลี่ยต่อออเดอร์', data.summary?.avg_order_value],
      ['อัตรา conversion (%)', data.summary?.conversion_rate],
      [],
      ['วันที่', 'รายรับ', 'ออเดอร์สร้าง'],
      ...(data.daily_revenue || []).map((d) => [d.date, d.revenue, d.orders]),
      [],
      ['แพ็กเกจ', 'จำนวน', 'รายได้'],
      ...(data.top_packages || []).map((p) => [p.title, p.count, p.revenue]),
    ];
    downloadCsv(`sales-report-${data.from}-${data.to}.csv`, rows);
  };

  const exportCustomersCsv = () => {
    if (!data) return;
    const rows = [
      ['รายงานลูกค้า PortfolioPro Studio'],
      ['จาก', data.from, 'ถึง', data.to],
      [],
      ['ชื่อ', 'อีเมล', 'จำนวนออเดอร์', 'รายได้'],
      ...(data.top_customers || []).map((c) => [c.name, c.email, c.order_count, c.revenue]),
      [],
      ['ลูกค้าค้างชำระยอดคงเหลือ'],
      ['ออเดอร์', 'ชื่อ', 'อีเมล', 'คงเหลือ'],
      ...(data.balance_due || []).map((b) => [b.order_id, b.customer_name, b.customer_email, b.amount_due]),
    ];
    downloadCsv(`customers-report-${data.from}-${data.to}.csv`, rows);
  };

  const exportRfmCsv = () => {
    if (!data?.rfm?.length) return;
    const rows = [
      ['RFM Analysis — PortfolioPro Studio'],
      ['สร้างเมื่อ', new Date().toISOString().slice(0, 10)],
      [],
      ['ชื่อ', 'อีเมล', 'Recency (วัน)', 'Frequency', 'Monetary', 'Segment'],
      ...data.rfm.map((c) => [c.name, c.email, c.recency_days, c.frequency, c.monetary, c.segment]),
    ];
    downloadCsv(`rfm-report-${data.from}-${data.to}.csv`, rows);
  };

  const handlePrint = () => window.print();

  if (authLoading) return <div className="admin-loading">กำลังโหลด...</div>;

  const summary = data?.summary || {};
  const funnel = data?.funnel || {};
  const webFunnel = data?.web_funnel || {};
  const clv = data?.clv || {};
  const funnelMax = Math.max(funnel.contacts, funnel.quotations, funnel.orders, funnel.paid, funnel.projects, 1);
  const webFunnelMax = Math.max(
    webFunnel.page_views, webFunnel.portfolio_views, webFunnel.product_views,
    webFunnel.add_to_cart, webFunnel.checkout_start, webFunnel.payment_success, 1,
  );
  const dailyMax = Math.max(...(data?.daily_revenue || []).map((d) => d.revenue), 1);
  const gaUrl = getGaDashboardUrl();
  const clarityUrl = getClarityDashboardUrl();

  return (
    <div className="admin-page dash-page rpt-page">
      <header className="dash-header">
        <div>
          <p className="dash-greeting">Analytics & Reporting</p>
          <h1>รายงาน & วิเคราะห์</h1>
          <p className="dash-date">ยอดขาย · Funnel · ข้อมูลลูกค้า</p>
        </div>
        <div className="dash-header-actions">
          <button type="button" className="rpt-export-btn rpt-print-btn" onClick={handlePrint} disabled={!data}>
            พิมพ์รายงาน
          </button>
          <Link to="/admin/dashboard" className="dash-refresh-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      <section className="rpt-toolbar">
        <div className="rpt-dates">
          <label>
            จาก
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            ถึง
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="button" className="dash-refresh-btn" onClick={load} disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'ดูรายงาน'}
          </button>
        </div>
        <div className="rpt-presets">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="rpt-preset-btn" onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}

      {data && !loading && (
        <>
          <div className="dash-kpi-grid rpt-kpi-grid">
            <div className="dash-kpi dash-kpi--primary">
              <div className="dash-kpi-icon"><AdminIcon name="chart" /></div>
              <div className="dash-kpi-body">
                <span className="dash-kpi-label">รายรับที่เก็บได้</span>
                <span className="dash-kpi-value">{fmtMoney(summary.revenue_collected)}</span>
                <span className="dash-kpi-sub">{data.from} — {data.to}</span>
              </div>
            </div>
            <div className="dash-kpi dash-kpi--emerald">
              <div className="dash-kpi-icon"><AdminIcon name="credit-card" /></div>
              <div className="dash-kpi-body">
                <span className="dash-kpi-label">ออเดอร์ชำระแล้ว</span>
                <span className="dash-kpi-value">{summary.orders_paid ?? 0}</span>
                <span className="dash-kpi-sub">จาก {summary.orders_created ?? 0} ออเดอร์ที่สร้าง</span>
              </div>
            </div>
            <div className="dash-kpi dash-kpi--violet">
              <div className="dash-kpi-icon"><AdminIcon name="target" /></div>
              <div className="dash-kpi-body">
                <span className="dash-kpi-label">Conversion</span>
                <span className="dash-kpi-value">{summary.conversion_rate ?? 0}%</span>
                <span className="dash-kpi-sub">สร้างออเดอร์ → ชำระแล้ว</span>
              </div>
            </div>
            <div className="dash-kpi dash-kpi--amber">
              <div className="dash-kpi-icon"><AdminIcon name="users" /></div>
              <div className="dash-kpi-body">
                <span className="dash-kpi-label">ลูกค้าซื้อซ้ำ</span>
                <span className="dash-kpi-value">{data.repeat_customers ?? 0}</span>
                <span className="dash-kpi-sub">2+ ออเดอร์ในช่วงที่เลือก</span>
              </div>
            </div>
          </div>

          <div className="dash-main-grid">
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>รายได้รายวัน</h2>
                <button type="button" className="rpt-export-btn" onClick={exportSalesCsv}>Export CSV</button>
              </div>
              {(data.daily_revenue || []).length === 0 ? (
                <p className="admin-panel-empty">ไม่มีข้อมูลในช่วงนี้</p>
              ) : (
                <div className="dash-bar-chart rpt-daily-chart">
                  {data.daily_revenue.map((row) => {
                    const h = Math.max((row.revenue / dailyMax) * 100, row.revenue > 0 ? 6 : 0);
                    return (
                      <div key={row.date} className="dash-bar-col" title={fmtMoney(row.revenue)}>
                        <div className="dash-bar-track">
                          <div className="dash-bar-fill" style={{ height: `${h}%` }} />
                        </div>
                        <span className="dash-bar-amount">{row.revenue > 0 ? fmtMoney(row.revenue) : '—'}</span>
                        <span className="dash-bar-label">{row.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Sales Funnel</h2>
                <span className="dash-panel-meta">ลีด → ชำระเงิน</span>
              </div>
              <FunnelBar label="ติดต่อเรา" count={funnel.contacts} max={funnelMax} color="amber" />
              <FunnelBar label="ใบเสนอราคา" count={funnel.quotations} max={funnelMax} color="violet" />
              <FunnelBar label="สร้างออเดอร์" count={funnel.orders} max={funnelMax} color="blue" />
              <FunnelBar label="ชำระแล้ว" count={funnel.paid} max={funnelMax} color="emerald" />
              <FunnelBar label="โปรเจกต" count={funnel.projects} max={funnelMax} color="slate" />
              {summary.lead_to_paid_rate > 0 && (
                <p className="rpt-funnel-note">อัตรา Lead → Paid: <strong>{summary.lead_to_paid_rate}%</strong></p>
              )}
            </section>
          </div>

          <div className="dash-main-grid">
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>แพ็กเกจขายดี</h2>
                <span className="dash-panel-meta">ตามรายรับในช่วงที่เลือก</span>
              </div>
              {(data.top_packages || []).length === 0 ? (
                <p className="admin-panel-empty">ยังไม่มียอดขาย</p>
              ) : (
                <ul className="dash-rank-list">
                  {data.top_packages.map((pkg, i) => (
                    <li key={pkg.id} className="dash-rank-item">
                      <span className="dash-rank-num">{i + 1}</span>
                      <div className="dash-rank-body">
                        <span className="dash-rank-title">{pkg.title}</span>
                        <span className="dash-rank-meta">{pkg.count} ครั้ง · {fmtMoney(pkg.revenue)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {(data.by_status || []).length > 0 && (
                <div className="rpt-breakdown">
                  <h3>สถานะออเดอร์</h3>
                  <ul>
                    {data.by_status.map((row) => (
                      <li key={row.status}>
                        <span>{ORDER_STATUS_LABELS[row.status] || row.status}</span>
                        <strong>{row.count}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>ช่องทางชำระเงิน</h2>
              </div>
              {(data.by_payment_method || []).length === 0 ? (
                <p className="admin-panel-empty">ไม่มีข้อมูล</p>
              ) : (
                <ul className="rpt-pay-list">
                  {data.by_payment_method.map((row) => (
                    <li key={row.method}>
                      <span>{PAYMENT_LABELS[row.method] || row.method}</span>
                      <strong>{row.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
              <div className="rpt-analytics-note">
                <AdminIcon name="eye" />
                <div>
                  <strong>Analytics ภายนอก</strong>
                  <p>
                    {isGaConfigured() || isClarityConfigured()
                      ? 'เปิดแดชบอร์ดเพื่อดู heatmap, session recording และรายละเอียดเชิงลึก'
                      : 'ตั้งค่า VITE_GA_ID และ VITE_CLARITY_ID ใน .env เพื่อเชื่อม Google Analytics / Microsoft Clarity'}
                  </p>
                  <div className="rpt-ext-links">
                    {gaUrl && (
                      <a href={gaUrl} target="_blank" rel="noopener noreferrer" className="rpt-ext-link">
                        Google Analytics ↗
                      </a>
                    )}
                    {clarityUrl && (
                      <a href={clarityUrl} target="_blank" rel="noopener noreferrer" className="rpt-ext-link">
                        Microsoft Clarity ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="dash-main-grid">
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Web Funnel</h2>
                <span className="dash-panel-meta">
                  {webFunnel.unique_sessions ?? 0} sessions · {webFunnel.cart_sessions ?? 0} ใส่ตะกร้า
                </span>
              </div>
              <FunnelBar label="Page views" count={webFunnel.page_views ?? 0} max={webFunnelMax} color="slate" />
              <FunnelBar label="ดู Portfolio" count={webFunnel.portfolio_views ?? 0} max={webFunnelMax} color="violet" />
              <FunnelBar label="ดูแพ็กเกจ" count={webFunnel.product_views ?? 0} max={webFunnelMax} color="blue" />
              <FunnelBar label="ใส่ตะกร้า" count={webFunnel.add_to_cart ?? 0} max={webFunnelMax} color="amber" />
              <FunnelBar label="เริ่มชำระ" count={webFunnel.checkout_start ?? 0} max={webFunnelMax} color="rose" />
              <FunnelBar label="ชำระสำเร็จ" count={webFunnel.payment_success ?? 0} max={webFunnelMax} color="emerald" />
            </section>

            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>หน้ายอดนิยม</h2>
                <span className="dash-panel-meta">จาก event tracking</span>
              </div>
              {(data.top_pages || []).length === 0 ? (
                <p className="admin-panel-empty">ยังไม่มี page views ในช่วงนี้</p>
              ) : (
                <ul className="dash-rank-list">
                  {data.top_pages.map((page, i) => (
                    <li key={page.path} className="dash-rank-item">
                      <span className="dash-rank-num">{i + 1}</span>
                      <div className="dash-rank-body">
                        <span className="dash-rank-title rpt-path">{page.path}</span>
                        <span className="dash-rank-meta">{page.views} views</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="dash-kpi-grid rpt-kpi-grid rpt-clv-grid">
            <div className="dash-kpi dash-kpi--primary">
              <div className="dash-kpi-icon"><AdminIcon name="users" /></div>
              <div className="dash-kpi-body">
                <span className="dash-kpi-label">CLV รวม (lifetime)</span>
                <span className="dash-kpi-value">{fmtMoney(clv.total_clv)}</span>
                <span className="dash-kpi-sub">จากลูกค้าที่ชำระแล้วทั้งหมด</span>
              </div>
            </div>
            <div className="dash-kpi dash-kpi--emerald">
              <div className="dash-kpi-icon"><AdminIcon name="chart" /></div>
              <div className="dash-kpi-body">
                <span className="dash-kpi-label">CLV เฉลี่ย</span>
                <span className="dash-kpi-value">{fmtMoney(clv.avg_clv)}</span>
                <span className="dash-kpi-sub">ต่อลูกค้า {clv.customer_count ?? 0} คน</span>
              </div>
            </div>
            {(data.rfm_segments || []).length > 0 && (
              <div className="dash-kpi dash-kpi--violet rpt-segment-kpi">
                <div className="dash-kpi-icon"><AdminIcon name="target" /></div>
                <div className="dash-kpi-body">
                  <span className="dash-kpi-label">RFM Segments</span>
                  <div className="rpt-segment-chips">
                    {data.rfm_segments.map((s) => (
                      <span key={s.segment} className={`rpt-segment rpt-segment--${SEGMENT_COLORS[s.segment] || 'default'}`}>
                        {s.segment} <strong>{s.count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dash-main-grid">
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>RFM Analysis</h2>
                <button type="button" className="rpt-export-btn" onClick={exportRfmCsv} disabled={!(data.rfm || []).length}>
                  Export RFM CSV
                </button>
              </div>
              {(data.rfm || []).length === 0 ? (
                <p className="admin-panel-empty">ยังไม่มีข้อมูลลูกค้าที่ชำระแล้ว</p>
              ) : (
                <div className="dash-table-wrap">
                  <table className="dash-table rpt-rfm-table">
                    <thead>
                      <tr>
                        <th>ลูกค้า</th>
                        <th>R</th>
                        <th>F</th>
                        <th>M</th>
                        <th>Segment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rfm.map((c) => (
                        <tr key={c.user_id}>
                          <td>
                            <span className="dash-cell-primary">{c.name || '—'}</span>
                            <span className="dash-cell-secondary">{c.email}</span>
                          </td>
                          <td>{c.recency_days}d</td>
                          <td>{c.frequency}</td>
                          <td>{fmtMoney(c.monetary)}</td>
                          <td>
                            <span className={`rpt-segment rpt-segment--${SEGMENT_COLORS[c.segment] || 'default'}`}>
                              {c.segment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Cohort Retention</h2>
                <span className="dash-panel-meta">6 เดือน · % ลูกค้ากลับมาซื้อ</span>
              </div>
              {(data.cohorts || []).length === 0 ? (
                <p className="admin-panel-empty">ยังไม่มีข้อมูล cohort</p>
              ) : (
                <div className="dash-table-wrap rpt-cohort-wrap">
                  <table className="dash-table rpt-cohort-table">
                    <thead>
                      <tr>
                        <th>Cohort</th>
                        <th>Size</th>
                        {[0, 1, 2, 3, 4, 5, 6].map((m) => (
                          <th key={m}>M{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.cohorts.map((row) => (
                        <tr key={row.cohort}>
                          <td>{row.cohort}</td>
                          <td>{row.size}</td>
                          {(row.retention || []).map((count, m) => {
                            const pct = row.size > 0 ? Math.round((count / row.size) * 100) : 0;
                            const heat = Math.min(pct, 100);
                            return (
                              <td key={m} className="rpt-cohort-cell" style={{ '--heat': `${heat}%` }}>
                                {row.size > 0 ? `${pct}%` : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="dash-main-grid">
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Top ลูกค้า (รายได้)</h2>
                <button type="button" className="rpt-export-btn" onClick={exportCustomersCsv}>Export CSV</button>
              </div>
              {(data.top_customers || []).length === 0 ? (
                <p className="admin-panel-empty">ยังไม่มีลูกค้าที่ชำระในช่วงนี้</p>
              ) : (
                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>ลูกค้า</th>
                        <th>ออเดอร์</th>
                        <th>รายได้</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_customers.map((c) => (
                        <tr key={c.user_id}>
                          <td>
                            <span className="dash-cell-primary">{c.name || '—'}</span>
                            <span className="dash-cell-secondary">{c.email}</span>
                          </td>
                          <td>{c.order_count}</td>
                          <td>{fmtMoney(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>ค้างชำระยอดคงเหลือ</h2>
                <Link to="/admin/orders" className="dash-panel-link">ดูออเดอร์ →</Link>
              </div>
              {(data.balance_due || []).length === 0 ? (
                <div className="dash-all-clear">
                  <AdminIcon name="check" />
                  <p>ไม่มียอดคงเหลือค้างชำระ</p>
                </div>
              ) : (
                <ul className="dash-attention-list">
                  {data.balance_due.map((b) => (
                    <li key={b.order_id}>
                      <Link to="/admin/orders" className="dash-attention-item">
                        <span className="dash-attention-badge quote">#{b.order_id}</span>
                        <span className="dash-attention-name">{b.customer_name}</span>
                        <span className="dash-attention-detail">{b.title} · คงเหลือ {fmtMoney(b.amount_due)}</span>
                        <span className="dash-attention-time">{b.customer_email}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {loading && !data && <div className="admin-loading">กำลังโหลดรายงาน...</div>}
    </div>
  );
}
