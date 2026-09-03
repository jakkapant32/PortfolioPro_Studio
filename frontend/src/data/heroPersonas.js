export const HERO_PERSONAS = [
  {
    id: 'fresh-graduate',
    src: '/images/hero/persona-senior.png',
    bg: '#2563eb',
    label: 'นักศึกษาจบใหม่',
    labelEn: 'FRESH GRADUATE',
    desc: 'Portfolio สำหรับสมัครงานครั้งแรก — โดดเด่นใน 30 วินาที สร้างความประทับใจให้ HR ตั้งแต่เปิดดู',
    centerScale: 1.58,
    centerHeight: '90%',
    enhance: 'contrast(1.08) saturate(1.1) brightness(0.97)',
    sharpCenter: true,
  },
  {
    id: 'freelance',
    src: '/images/hero/persona-professional.png',
    bg: '#F4845F',
    label: 'ฟรีแลนซ์',
    labelEn: 'FREELANCE',
    desc: 'Portfolio สำหรับ Freelancer — รวมผลงาน รับงาน และสร้างความน่าเชื่อถือกับลูกค้า',
    centerScale: 1.68,
    centerHeight: '90%',
    centerBottom: '12%',
    enhance: 'contrast(1.08) saturate(1.1) brightness(0.97)',
    sharpCenter: true,
  },
  {
    id: 'young-professional',
    src: '/images/hero/persona-graduate.png',
    bg: '#5c6b7a',
    label: 'วัยทำงาน',
    labelEn: 'YOUNG PROFESSIONAL',
    desc: 'เว็บส่วนตัวที่สะท้อนผลงานและทักษะ — สร้างแบรนด์ตัวเอง โดดเด่นในวงการทำงาน',
    centerScale: 1.32,
    sharpCenter: true,
  },
  {
    id: 'senior-expert',
    src: '/images/hero/persona-entrepreneur.png',
    bg: '#243b55',
    label: 'ผู้ทรงคุณวุฒิ',
    labelEn: 'SENIOR EXPERT',
    desc: 'Portfolio ระดับ executive — สื่อสารความน่าเชื่อถือ ประสบการณ์ และผลงานเชิงลึก',
    centerScale: 1.32,
    sharpCenter: true,
  },
];

export const HERO_TRANSITION = '650ms cubic-bezier(0.4, 0, 0.2, 1)';
export const HERO_ANIM_LOCK_MS = 650;

export const HERO_GRAIN_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")";
