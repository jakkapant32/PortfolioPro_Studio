export default function AdminIcon({ name }) {
  return (
    <svg className="admin-nav-icon" aria-hidden="true">
      <use href={`#icon-${name}`} />
    </svg>
  );
}
