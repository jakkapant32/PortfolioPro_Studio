import AdminIcon from './AdminIcon';

export default function AdminSearchInput({ value, onChange, placeholder = 'ค้นหา...' }) {
  return (
    <div className="admin-search">
      <AdminIcon name="search" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="admin-search-clear"
          onClick={() => onChange('')}
          aria-label="ล้างการค้นหา"
        >
          ×
        </button>
      )}
    </div>
  );
}
