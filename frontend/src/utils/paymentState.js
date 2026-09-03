export function derivePaymentState(orderInfo) {
  if (!orderInfo) {
    return {
      depositPercent: 100,
      amountPaid: 0,
      amountDue: 0,
      fullyPaid: true,
      needsBalance: false,
    };
  }

  const depositPercent = orderInfo.deposit_percent || 100;
  const total = Number(orderInfo.total) || 0;
  let amountPaid = Number(orderInfo.amount_paid) || 0;

  // ออเดอร์เก่าก่อนมีระบบมัดจำ — ถือว่าชำระครบแล้ว
  if (amountPaid <= 0 && orderInfo.status === 'successful') {
    amountPaid = total;
  }

  const amountDue = orderInfo.amount_due != null
    ? Number(orderInfo.amount_due)
    : Math.max(0, total - amountPaid);

  const fullyPaid = orderInfo.fully_paid != null
    ? Boolean(orderInfo.fully_paid)
    : orderInfo.status === 'successful' || amountDue <= 0.01;

  const needsBalance = !fullyPaid && amountDue > 0.01 && orderInfo.status === 'deposit_paid';

  return { depositPercent, amountPaid, amountDue, fullyPaid, needsBalance };
}

export function availableDepositOptions(total, options, omiseMin = 0) {
  const list = options?.length ? options : [
    { percent: 100, label: 'ชำระเต็ม 100%', sla: 'คิวด่วน · เริ่มภายใน 1–2 วันทำการ', recommended: true },
    { percent: 50, label: 'มัดจำ 50%', sla: 'คิวปกติ · เริ่มภายใน 3–5 วันทำการ' },
    { percent: 30, label: 'มัดจำ 30%', sla: 'คิวรอ · เริ่มภายใน 7–14 วันทำการ' },
  ];

  return list.map((opt) => {
    const payNow = Math.round(total * opt.percent / 100);
    const disabled = payNow > 0 && payNow < omiseMin;
    return {
      ...opt,
      payNow,
      disabled,
      disabledReason: disabled ? `ยอดต่ำกว่า ฿${omiseMin} (ขั้นต่ำ Omise)` : null,
    };
  });
}
