import { useEffect, useMemo, useState } from 'react';
import { useRequireAdmin, formatDate } from '../../hooks/useRequireAdmin';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/admin';
import { validatePassword } from '../../utils/password';
import AdminSearchInput from '../../components/admin/AdminSearchInput';
import { filterBySearch } from '../../utils/adminSearch';

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: 'customer',
};

export default function AdminUsers() {
  const { token, user: currentUser, loading: authLoading } = useRequireAdmin();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    if (!token) return;
    getUsers(token)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token]);

  const filteredItems = useMemo(
    () => filterBySearch(items, search, [
      'id', 'name', 'email', 'role',
      (row) => (row.role === 'admin' ? 'admin' : 'ลูกค้า customer'),
    ]),
    [items, search],
  );

  const openNew = () => {
    setEditing('new');
    setForm({ ...EMPTY });
    setError(null);
  };

  const openEdit = (row) => {
    setEditing(row.id);
    setForm({
      name: row.name || '',
      email: row.email || '',
      password: '',
      role: row.role || 'customer',
    });
    setError(null);
  };

  const close = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        const pwdErr = validatePassword(form.password);
        if (pwdErr) throw new Error(pwdErr);
        await createUser(token, {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      } else {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
        };
        if (form.password) {
          const pwdErr = validatePassword(form.password);
          if (pwdErr) throw new Error(pwdErr);
          payload.password = form.password;
        }
        await updateUser(token, editing, payload);
      }
      close();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (row.id === currentUser?.id) {
      setError('ไม่สามารถลบบัญชีตัวเองได้');
      return;
    }
    if (!window.confirm(`ลบสมาชิก "${row.name}" (${row.email})?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteUser(token, row.id);
      if (editing === row.id) close();
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
        <h1>สมาชิก</h1>
        <p>เพิ่ม แก้ไข และลบบัญชีผู้ใช้บนเว็บ</p>
      </header>

      <div className="admin-toolbar">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อ, อีเมล, บทบาท..." />
        <button type="button" className="btn-primary" onClick={openNew}>+ เพิ่มสมาชิก</button>
      </div>

      {error && !editing && <div className="form-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ชื่อ</th>
              <th>อีเมล</th>
              <th>บทบาท</th>
              <th>สมัครเมื่อ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={6} className="admin-empty">{search ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีสมาชิก'}</td></tr>
            ) : filteredItems.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>
                  <span className={`admin-badge ${row.role === 'admin' ? 'role-admin' : ''}`}>
                    {row.role === 'admin' ? 'Admin' : 'ลูกค้า'}
                  </span>
                </td>
                <td>{formatDate(row.created_at)}</td>
                <td className="admin-actions">
                  <button type="button" className="admin-btn-secondary" onClick={() => openEdit(row)}>แก้ไข</button>
                  <button
                    type="button"
                    className="admin-btn-danger"
                    onClick={() => remove(row)}
                    disabled={row.id === currentUser?.id}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="admin-modal-overlay" onClick={close}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-modal-close" onClick={close}>&times;</button>
            <h2>{editing === 'new' ? 'เพิ่มสมาชิก' : 'แก้ไขสมาชิก'}</h2>
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label>ชื่อ</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>อีเมล</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>{editing === 'new' ? 'รหัสผ่าน' : 'รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)'}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                placeholder={editing === 'new' ? 'อย่างน้อย 8 ตัว + ตัวเลข' : '••••••••'}
              />
            </div>
            <div className="form-group">
              <label>บทบาท</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={editing === currentUser?.id}
              >
                <option value="customer">ลูกค้า</option>
                <option value="admin">Admin</option>
              </select>
              {editing === currentUser?.id && (
                <small className="form-hint">ไม่สามารถเปลี่ยนบทบาทของบัญชีที่กำลังใช้งานอยู่</small>
              )}
            </div>

            <div className="admin-modal-actions">
              {editing !== 'new' && editing !== currentUser?.id && (
                <button type="button" className="admin-btn-danger" onClick={() => remove(items.find((i) => i.id === editing))} disabled={saving}>
                  ลบ
                </button>
              )}
              <button type="button" className="admin-btn-secondary" onClick={close}>ยกเลิก</button>
              <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
