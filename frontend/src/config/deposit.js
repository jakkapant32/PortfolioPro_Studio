export const DEPOSIT_OPTIONS = [
  {
    percent: 100,
    label: 'ชำระเต็ม 100%',
    sla: 'คิวด่วน · เริ่มภายใน 1–2 วันทำการ',
    recommended: true,
  },
  {
    percent: 50,
    label: 'มัดจำ 50%',
    sla: 'คิวปกติ · เริ่มภายใน 3–5 วันทำการ',
  },
  {
    percent: 30,
    label: 'มัดจำ 30%',
    sla: 'คิวรอ · เริ่มภายใน 7–14 วันทำการ',
  },
];

export function chargeAmount(total, percent) {
  return Math.round(total * percent / 100);
}
