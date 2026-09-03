import { DEPOSIT_OPTIONS, chargeAmount } from '../config/deposit';
import { availableDepositOptions } from '../utils/paymentState';

export default function DepositSelector({ total, value, onChange, options = DEPOSIT_OPTIONS, omiseMin = 0 }) {
  const resolved = availableDepositOptions(total, options, omiseMin);

  return (
    <div className="deposit-selector">
      <h3 className="deposit-selector-title">เลือกรูปแบบการชำระ</h3>
      <div className="deposit-options">
        {resolved.map((opt) => {
          const active = value === opt.percent;
          return (
            <button
              key={opt.percent}
              type="button"
              className={`deposit-option ${active ? 'active' : ''} ${opt.disabled ? 'disabled' : ''}`}
              onClick={() => !opt.disabled && onChange(opt.percent)}
              disabled={opt.disabled}
            >
              <div className="deposit-option-head">
                <strong>{opt.label}</strong>
                {opt.recommended && !opt.disabled && <span className="deposit-badge">แนะนำ</span>}
              </div>
              <p className="deposit-sla">{opt.sla}</p>
              {opt.disabled ? (
                <p className="deposit-disabled">{opt.disabledReason}</p>
              ) : (
                <p className="deposit-amount">
                  ชำระตอนนี้ <strong>฿{opt.payNow.toLocaleString()}</strong>
                  {opt.percent < 100 && (
                    <span> · คงเหลือ ฿{(total - opt.payNow).toLocaleString()}</span>
                  )}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
