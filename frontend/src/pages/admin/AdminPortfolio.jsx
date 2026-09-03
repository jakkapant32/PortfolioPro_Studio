import { useEffect, useMemo, useState } from 'react';
import { useRequireAdmin, formatDate } from '../../hooks/useRequireAdmin';
import { getAdminPortfolio, createPortfolio, updatePortfolio, deletePortfolio } from '../../api/admin';
import AdminSearchInput from '../../components/admin/AdminSearchInput';
import { filterBySearch } from '../../utils/adminSearch';

const CATEGORIES = [
  { value: 'website', label: 'Website' },
  { value: 'system', label: 'System' },
  { value: 'solution', label: 'Solution' },
];

const EMPTY = {
  slug: '',
  category: 'website',
  tag: '',
  title: '',
  description: '',
  price: 0,
  delivery_time: '',
  image: '',
  gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  features: [],
  sort_order: 0,
  published: true,
};

function toForm(item) {
  if (!item) return { ...EMPTY };
  return {
    slug: item.slug || '',
    category: item.category || 'website',
    tag: item.tag || '',
    title: item.title || '',
    description: item.description || '',
    price: item.price || 0,
    delivery_time: item.deliveryTime || item.delivery_time || '',
    image: item.image || '',
    gradient: item.gradient || EMPTY.gradient,
    features: item.features || [],
    sort_order: item.sort_order ?? 0,
    published: item.published !== false,
  };
}

export default function AdminPortfolio() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    if (!token) return;
    getAdminPortfolio(token)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token]);

  const filteredItems = useMemo(
    () => filterBySearch(items, search, ['title', 'slug', 'category', 'tag', 'description']),
    [items, search],
  );

  const openNew = () => {
    setEditing('new');
    setForm({ ...EMPTY });
    setError(null);
  };

  const openEdit = (row) => {
    setEditing(row.id);
    setForm(toForm(row));
    setError(null);
  };

  const close = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      price: Number(form.price),
      sort_order: Number(form.sort_order),
      features: Array.isArray(form.features) ? form.features : String(form.featuresText || '').split('\n').map((s) => s.trim()).filter(Boolean),
    };
    delete payload.featuresText;
    try {
      if (editing === 'new') {
        await createPortfolio(token, payload);
      } else {
        await updatePortfolio(token, editing, payload);
      }
      close();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || editing === 'new') return;
    if (!window.confirm('ลบรายการนี้?')) return;
    setSaving(true);
    try {
      await deletePortfolio(token, editing);
      close();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const featuresText = Array.isArray(form.features) ? form.features.join('\n') : '';

  if (authLoading) return <div className="admin-loading">กำลังโหลด...</div>;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>บริการ / Portfolio</h1>
        <p>จัดการแพ็กเกจและราคาที่แสดงบนเว็บ</p>
      </header>

      <div className="admin-toolbar">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อ, slug, หมวด..." />
        <button type="button" className="btn-primary" onClick={openNew}>+ เพิ่มรายการ</button>
      </div>

      {error && !editing && <div className="form-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>หมวด</th>
              <th>ราคา</th>
              <th>สถานะ</th>
              <th>ลำดับ</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={5} className="admin-empty">{search ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีรายการ'}</td></tr>
            ) : filteredItems.map((row) => (
              <tr key={row.id} className="admin-row-click" onClick={() => openEdit(row)}>
                <td>
                  <div>{row.title}</div>
                  <small>{row.slug}</small>
                </td>
                <td>{row.category}</td>
                <td>฿{Number(row.price).toLocaleString()}</td>
                <td>
                  <span className={`admin-badge ${row.published ? 'status-successful' : ''}`}>
                    {row.published ? 'เผยแพร่' : 'ซ่อน'}
                  </span>
                </td>
                <td>{row.sort_order}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="admin-modal-overlay" onClick={close}>
          <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-modal-close" onClick={close}>&times;</button>
            <h2>{editing === 'new' ? 'เพิ่มบริการ' : 'แก้ไขบริการ'}</h2>
            {error && <div className="form-error">{error}</div>}
            <div className="admin-form-row">
              <label>Slug (URL)</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="my-service" />
            </div>
            <div className="admin-detail-grid">
              <div className="admin-form-row">
                <label>ชื่อ</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label>หมวด</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="admin-form-row">
                <label>แท็ก</label>
                <input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label>ราคา (฿)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label>ระยะเวลาส่งมอบ</label>
                <input value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} placeholder="7-14 วัน" />
              </div>
              <div className="admin-form-row">
                <label>ลำดับ</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              </div>
            </div>
            <div className="admin-form-row">
              <label>คำอธิบาย</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="admin-form-row">
              <label>รูปภาพ (URL)</label>
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://... หรือ /images/my-photo.jpg"
              />
              <small className="form-hint">วางลิงก์รูปจากเว็บ หรืออัปโหลดไฟล์ไปที่ frontend/public/images/ แล้วใส่ /images/ชื่อไฟล์.jpg</small>
              {form.image && (
                <img src={form.image} alt="" className="admin-image-preview" />
              )}
            </div>
            <div className="admin-form-row">
              <label>ฟีเจอร์ (หนึ่งบรรทัดต่อหนึ่งรายการ)</label>
              <textarea rows={4} value={featuresText} onChange={(e) => setForm({ ...form, features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
            </div>
            <div className="admin-form-row">
              <label>Gradient CSS</label>
              <input value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} />
            </div>
            <div className="admin-form-row">
              <label>
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                {' '}เผยแพร่บนเว็บ
              </label>
            </div>
            <div className="admin-form-actions">
              <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              {editing !== 'new' && (
                <button type="button" className="admin-btn-danger" onClick={remove} disabled={saving}>ลบ</button>
              )}
              <button type="button" className="admin-btn-secondary" onClick={close}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
