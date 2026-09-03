import { useState } from 'react';

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  required = false,
  placeholder,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        aria-pressed={visible}
      >
        <svg className="password-toggle-icon" aria-hidden="true">
          {visible ? (
            <use href="#icon-eye-off" />
          ) : (
            <use href="#icon-eye" />
          )}
        </svg>
      </button>
    </div>
  );
}
