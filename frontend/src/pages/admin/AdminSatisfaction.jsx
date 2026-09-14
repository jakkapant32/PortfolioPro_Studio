import { useEffect, useMemo, useState } from 'react';
import { useRequireAdmin, formatDate } from '../../hooks/useRequireAdmin';
import { getSatisfactions, deleteSatisfaction } from '../../api/admin';
import AdminSearchInput from '../../components/admin/AdminSearchInput';
import { filterBySearch } from '../../utils/adminSearch';

const SERVICE_LABELS = {
  portfolio: 'Portfolio Website',
  corporate: 'Corporate Website',
  crm: 'CRM',
  rental: 'ระบบเช่ารถ',
  other: 'อื่นๆ',
};

function Stars({ rating }) {
  return (
    <span className="admin-satisfaction-stars" aria-label={`${rating} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} className={n <= rating ? 'on' : ''}><use href="#icon-star" /></svg>
      ))}
    </span>
  );
}

export default function AdminSatisfaction() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [items, setItems] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    if (!token) return;
    getSatisfactions(token)
      .then((data) => {
        setItems(data.items || []);
        setAvgRating(data.avg_rating || 0);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token]);

  const filteredItems = useMemo(
    () => filterBySearch(items, search, [
      'id', 'name', 'email', 'service', 'comment', 'rating',
      (row) => SERVICE_LABELS[row.service] || row.service,
    ]),
    [items, search],
  );

  const remove = async (row) => {
    if (!window.confirm('ลบแบบประเมินนี้?')) return;
    try {
      await deleteSatisfaction(token, row.id);
      if (selected?.id === row.id) setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading) return <div className="admin-loading">กำลังโหลด...</div>;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>ประเมินความพึงพอใจ</h1>
        <p>
          คะแนนเฉลี่ย {avgRating ? avgRating.toFixed(1) : '—'} / 5
          {' · '}
          ทั้งหมด {items.length} รายการ
        </p>
      </header>

      <div className="admin-toolbar">
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาชื่อ, อีเมล, ความคิดเห็น..."
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ชื่อ</th>
              <th>คะแนน</th>
              <th>บริการ</th>
              <th>วันที่</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  {search ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีแบบประเมิน'}
                </td>
              </tr>
            ) : (
              filteredItems.map((row) => (
                <tr key={row.id} className="admin-row-click" onClick={() => setSelected(row)}>
                  <td>{row.id}</td>
                  <td>
                    <div>{row.name}</div>
                    <small>{row.email}</small>
                  </td>
                  <td><Stars rating={row.rating} /></td>
                  <td>{SERVICE_LABELS[row.service] || row.service || '—'}</td>
                  <td>{formatDate(row.created_at)}</td>
                  <td />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-modal-close" onClick={() => setSelected(null)}>&times;</button>
            <h2>แบบประเมิน #{selected.id}</h2>
            <div className="admin-detail-grid">
              <div><strong>ชื่อ</strong><p>{selected.name}</p></div>
              <div><strong>อีเมล</strong><p>{selected.email}</p></div>
              <div><strong>คะแนน</strong><p><Stars rating={selected.rating} /></p></div>
              <div><strong>บริการ</strong><p>{SERVICE_LABELS[selected.service] || selected.service || '—'}</p></div>
            </div>
            <p><strong>ความคิดเห็น</strong></p>
            <p className="admin-message">{selected.comment || '—'}</p>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn-danger" onClick={() => remove(selected)}>ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
