const BASE_STEPS = [
  { key: 'paid', label: 'ชำระมัดจำ/เต็มแล้ว' },
  { key: 'contract', label: 'ยอมรับสัญญา' },
  { key: 'progress', label: 'กำลังดำเนินการ' },
  { key: 'delivery', label: 'รับงานที่ส่งมอบ' },
];

function buildSteps(depositPercent, fullyPaid) {
  const steps = [...BASE_STEPS];
  if (depositPercent < 100 && !fullyPaid) {
    steps.splice(3, 0, { key: 'balance', label: 'ชำระยอดที่เหลือ' });
  }
  return steps;
}

function contractStepLabel(status) {
  if (status === 'pending') return 'รอสัญญาจากแอดมิน';
  return 'ยอมรับสัญญา';
}

function stepIndex(status, depositPercent, fullyPaid) {
  const hasBalance = depositPercent < 100 && !fullyPaid;
  switch (status) {
    case 'pending':
      return 1;
    case 'contract_sent':
      return 1;
    case 'contract_accepted':
    case 'in_progress':
      return hasBalance && !fullyPaid ? 3 : 2;
    case 'delivered':
      return hasBalance ? 4 : 3;
    case 'completed':
      return hasBalance ? 5 : 4;
    default:
      return 0;
  }
}

export default function ProjectChecklist({
  status,
  depositPercent = 100,
  fullyPaid = false,
  compact = false,
}) {
  const steps = buildSteps(depositPercent, fullyPaid);
  const current = stepIndex(status, depositPercent, fullyPaid);

  return (
    <ol className={`project-checklist ${compact ? 'project-checklist-compact' : ''}`}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={step.key}
            className={`project-checklist-item ${done ? 'done' : ''} ${active ? 'active' : ''}`}
          >
            <span className="project-checklist-dot">{done ? '✓' : i + 1}</span>
            <span>{step.key === 'contract' ? contractStepLabel(status) : step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
