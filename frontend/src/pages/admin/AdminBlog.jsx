import { useEffect, useMemo, useState } from 'react';
import { useRequireAdmin } from '../../hooks/useRequireAdmin';
import { getAdminBlog, createBlog, updateBlog, deleteBlog } from '../../api/admin';
import AdminSearchInput from '../../components/admin/AdminSearchInput';
import { filterBySearch } from '../../utils/adminSearch';

const EMPTY = {
  slug: '',
  title: '',
  excerpt: '',
  date: new Date().toISOString().slice(0, 10),
  tag: '',
  image: '',
  content: '',
  sort_order: 0,
  published: true,
};

function toForm(post) {
  if (!post) return { ...EMPTY };
  return {
    slug: post.slug || '',
    title: post.title || '',
    excerpt: post.excerpt || '',
    date: post.date || EMPTY.date,
    tag: post.tag || '',
    image: post.image || '',
    content: post.content || '',
    sort_order: post.sort_order ?? 0,
    published: post.published !== false,
  };
}

export default function AdminBlog() {
  const { token, loading: authLoading } = useRequireAdmin();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    if (!token) return;
    getAdminBlog(token)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token]);

  const filteredItems = useMemo(
    () => filterBySearch(items, search, ['title', 'slug', 'tag', 'excerpt']),
    [items, search],
  );

  const openNew = () => {
    setEditing('new');
    setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
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
    const payload = { ...form, sort_order: Number(form.sort_order) };
    try {
      if (editing === 'new') {
        await createBlog(token, payload);
      } else {
        await updateBlog(token, editing, payload);
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
    if (!window.confirm('ลบบทความนี้?')) return;
    setSaving(true);
    try {
      await deleteBlog(token, editing);
      close();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="admin-loading">กำลังโหลด...</div>;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1>บทความ</h1>
        <p>จัดการเนื้อหา Blog บนเว็บ</p>
      </header>

      <div className="admin-toolbar">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="ค้นหาหัวข้อ, slug, tag..." />
        <button type="button" className="btn-primary" onClick={openNew}>+ เพิ่มบทความ</button>
      </div>

      {error && !editing && <div className="form-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>หัวข้อ</th>
              <th>วันที่</th>
              <th>สถานะ</th>
              <th>ลำดับ</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={4} className="admin-empty">{search ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีบทความ'}</td></tr>
            ) : filteredItems.map((row) => (
              <tr key={row.id} className="admin-row-click" onClick={() => openEdit(row)}>
                <td>
                  <div>{row.title}</div>
                  <small>{row.slug}</small>
                </td>
                <td>{row.date}</td>
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
            <h2>{editing === 'new' ? 'เพิ่มบทความ' : 'แก้ไขบทความ'}</h2>
            {error && <div className="form-error">{error}</div>}
            <div className="admin-detail-grid">
              <div className="admin-form-row">
                <label>Slug</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label>วันที่</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="admin-form-row">
              <label>หัวข้อ</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="admin-form-row">
              <label>แท็ก / หมวด</label>
              <input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
            </div>
            <div className="admin-form-row">
              <label>คำโปรย</label>
              <textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            </div>
            <div className="admin-form-row">
              <label>รูปปก (URL)</label>
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://... หรือ /images/blog-cover.jpg"
              />
              <small className="form-hint">วางลิงก์รูป หรือใส่ path จากโฟลเดอร์ public/images/</small>
              {form.image && (
                <img src={form.image} alt="" className="admin-image-preview" />
              )}
            </div>
            <div className="admin-form-row">
              <label>เนื้อหา (HTML)</label>
              <textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="admin-form-row">
              <label>ลำดับ</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
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
