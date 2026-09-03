/* ===== Mock Data ===== */
const PORTFOLIO_ITEMS = [
  {
    id: 1, category: 'portfolio',
    tag: 'Portfolio Website', title: 'Portfolio นักศึกษาจบใหม่',
    desc: 'เว็บไซต์โชว์ผลงานสำหรับสมัครงานสาย UX/UI Design และ Developer คอนเซปต์เรียบหรูสไตล์ Minimalist',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 2, category: 'corporate',
    tag: 'Corporate Website', title: 'เว็บไซต์บริษัท SME พรีเมียม',
    desc: 'เว็บไซต์องค์กรสำหรับธุรกิจบริการ มาพร้อมหน้าติดต่อ ฟอร์มรับข้อมูล และระบบนัดหมายปรึกษา',
    price: 14900,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 3, category: 'system',
    tag: 'Business System', title: 'ระบบบริหารฝ่ายขาย (CRM Dashboard)',
    desc: 'ระบบจัดการลูกค้าสัมพันธ์และติดตามยอดขายแบบ Real-time พร้อมแดชบอร์ดสรุปสถิติครบครัน',
    price: 28500,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 4, category: 'system',
    tag: 'Business System', title: 'ระบบเช่ารถและจองคิวออนไลน์',
    desc: 'แพลตฟอร์มตรวจสอบสถานะ ตารางเวลารถว่าง ชำระเงินมัดจำออนไลน์ และระบบหลังบ้านจัดคิวรถยนต์',
    price: 22000,
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 5, category: 'system',
    tag: 'E-commerce Store', title: 'ระบบร้านค้าออนไลน์เต็มรูปแบบ',
    desc: 'ระบบร้านช้อปปิ้งพร้อมตะกร้าสินค้า ตัดบัตรเครดิต/สแกน QR Code และระบบจัดการคลังสต็อก',
    price: 19900,
    image: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 6, category: 'system',
    tag: 'Web Application', title: 'ระบบคอร์สเรียนออนไลน์ (LMS)',
    desc: 'แพลตฟอร์มสำหรับโรงเรียนหรือติวเตอร์ วิดีโอสตรีมมิ่งบทเรียน ตรวจสอบความคืบหน้าและแบบทดสอบ',
    price: 25000,
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'
  }
];

const DASHBOARD_PROJECTS = [
  { name: 'Portfolio ส่วนตัว', status: 'online', views: 1240 },
  { name: 'เว็บไซต์บริษัท ABC', status: 'online', views: 856 },
  { name: 'CRM Dashboard', status: 'draft', views: 0 },
  { name: 'ระบบเช่ารถออนไลน์', status: 'online', views: 432 }
];

/* ===== State ===== */
let cart = [];
let isLoginMode = true;
let isLoggedIn = false;
let currentUser = null;
let currentFilter = 'all';
let currentDashboardTab = 'overview';

/* ===== Navigation ===== */
function navigateTo(pageId) {
  document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
  const navLink = document.getElementById('nav-' + pageId);
  if (navLink) navLink.classList.add('active');

  updateNavAuthState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavAuthState() {
  const loginBtn = document.getElementById('nav-login-btn');
  const dashboardNav = document.getElementById('nav-dashboard');
  if (isLoggedIn) {
    loginBtn.textContent = currentUser?.name || 'บัญชีของฉัน';
    loginBtn.onclick = () => navigateTo('dashboard');
    if (dashboardNav) dashboardNav.style.display = 'flex';
  } else {
    loginBtn.innerHTML = 'เข้าสู่ระบบ <svg class="icon-sm" style="stroke:white;"><use href="#icon-arrow-right"/></svg>';
    loginBtn.onclick = () => navigateTo('login');
    if (dashboardNav) dashboardNav.style.display = 'none';
  }
}

/* ===== Auth ===== */
function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const nameGroup = document.getElementById('name-group');
  const switchText = document.getElementById('auth-switch-text');
  const switchLink = document.getElementById('auth-switch-link');
  const submitBtn = document.getElementById('auth-submit-btn');

  if (isLoginMode) {
    title.textContent = 'เข้าสู่ระบบ';
    subtitle.textContent = 'จัดการหน้า Portfolio และผลงานดิจิทัลของคุณ';
    nameGroup.style.display = 'none';
    switchText.textContent = 'ยังไม่มีบัญชีใช่ไหม?';
    switchLink.textContent = 'สมัครสมาชิกฟรี';
    submitBtn.textContent = 'เข้าสู่ระบบ';
  } else {
    title.textContent = 'สร้างบัญชีใหม่';
    subtitle.textContent = 'เริ่มต้นสร้าง Portfolio ระดับมืออาชีพของคุณในไม่กี่นาที';
    nameGroup.style.display = 'block';
    switchText.textContent = 'มีบัญชีอยู่แล้วใช่ไหม?';
    switchLink.textContent = 'เข้าสู่ระบบที่นี่';
    submitBtn.textContent = 'สมัครสมาชิก';
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const name = document.getElementById('auth-name').value || email.split('@')[0];
  isLoggedIn = true;
  currentUser = { name, email };
  showToast(isLoginMode ? 'เข้าสู่ระบบสำเร็จ!' : 'สมัครสมาชิกสำเร็จ!');
  navigateTo('dashboard');
}

function logout() {
  isLoggedIn = false;
  currentUser = null;
  showToast('ออกจากระบบแล้ว');
  navigateTo('home');
}

/* ===== Portfolio Render & Filter ===== */
function renderPortfolioGrid() {
  const grid = document.getElementById('portfolio-grid');
  if (!grid) return;

  grid.innerHTML = PORTFOLIO_ITEMS.map(item => `
    <div class="portfolio-item" data-category="${item.category}">
      <div>
        <div class="portfolio-img">
          <img src="${item.image}" alt="${item.title}" loading="lazy">
        </div>
        <div class="portfolio-info">
          <span class="portfolio-tag"><svg><use href="#icon-tag"/></svg> ${item.tag}</span>
          <h3>${item.title}</h3>
          <p>${item.desc}</p>
        </div>
      </div>
      <div class="portfolio-info" style="padding-top:0;">
        <div class="portfolio-buy-row">
          <span class="portfolio-price">฿${item.price.toLocaleString()}</span>
          <button class="btn-add-cart" onclick="addToCart(${item.id})">
            <svg class="icon-sm" style="stroke:currentColor;fill:none;"><use href="#icon-cart"/></svg> เพิ่มลงตะกร้า
          </button>
        </div>
      </div>
    </div>
  `).join('');

  applyFilter(currentFilter);
}

function filterPortfolio(category, btn) {
  currentFilter = category;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilter(category);
}

function applyFilter(category) {
  document.querySelectorAll('.portfolio-item').forEach(item => {
    const match = category === 'all' || item.dataset.category === category;
    item.classList.toggle('hidden', !match);
  });
}

/* ===== Cart ===== */
function toggleCart() {
  document.getElementById('cartDrawer').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('show');
}

function addToCart(id) {
  const item = PORTFOLIO_ITEMS.find(p => p.id === id);
  if (!item) return;
  if (cart.find(c => c.id === id)) {
    showToast('บริการนี้อยู่ในตะกร้าแล้ว');
    return;
  }
  cart.push({ id: item.id, name: item.title, price: item.price });
  updateCartUI();
  showToast('เพิ่มลงตะกร้าแล้ว');
  if (!document.getElementById('cartDrawer').classList.contains('open')) toggleCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  updateCartUI();
}

function updateCartUI() {
  const count = document.getElementById('cart-count');
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotalPrice');
  count.textContent = cart.length;

  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty"><svg><use href="#icon-cart"/></svg><p>ไม่มีรายการในตะกร้า</p></div>`;
    totalEl.textContent = '฿0';
    return;
  }

  let total = 0;
  container.innerHTML = cart.map(item => {
    total += item.price;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">฿${item.price.toLocaleString()}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
          <svg class="icon-sm" style="stroke:currentColor;fill:none;width:14px;height:14px;"><use href="#icon-trash"/></svg> ลบ
        </button>
      </div>`;
  }).join('');
  totalEl.textContent = `฿${total.toLocaleString()}`;
}

function checkout() {
  if (cart.length === 0) {
    showToast('กรุณาเลือกบริการอย่างน้อย 1 รายการ');
    return;
  }
  showToast('ส่งข้อมูลสั่งจองสำเร็จ! ทีมงานจะติดต่อกลับเร็วๆ นี้');
  cart = [];
  updateCartUI();
  toggleCart();
}

/* ===== Dashboard ===== */
function switchDashboardTab(tab, link) {
  currentDashboardTab = tab;
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  link.classList.add('active');
  document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('dash-tab-' + tab).classList.add('active');
}

function renderDashboardProjects() {
  const list = document.getElementById('project-list');
  if (!list) return;
  list.innerHTML = DASHBOARD_PROJECTS.map(p => `
    <div class="project-row">
      <div>
        <strong>${p.name}</strong>
        <div style="font-size:0.85rem;color:var(--text-light);margin-top:4px;">${p.views.toLocaleString()} ครั้งที่เข้าชม</div>
      </div>
      <span class="project-status ${p.status}">${p.status === 'online' ? 'ออนไลน์' : 'แบบร่าง'}</span>
    </div>
  `).join('');
}

/* ===== Contact Form ===== */
function handleContactSubmit(e) {
  e.preventDefault();
  showToast('ส่งข้อความสำเร็จ! เราจะติดต่อกลับภายใน 24 ชม.');
  e.target.reset();
}

/* ===== Toast ===== */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderPortfolioGrid();
  renderDashboardProjects();
  updateCartUI();
  updateNavAuthState();
});
