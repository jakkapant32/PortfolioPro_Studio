# PortfolioPro Studio

เว็บไซต์ธุรกิจรับทำ Portfolio Website, Corporate Website และ Business System

**Frontend:** React + Vite → Deploy บน [Vercel](https://vercel.com)  
**Backend:** Golang + PostgreSQL → Deploy บน [Render](https://render.com)

---

## โครงสร้างโปรเจกต

```
PortfolioPro Studio/
├── frontend/     # React app
├── backend/      # Go API
├── docker-compose.yml
└── render.yaml   # Render Blueprint
```

---

## รัน Frontend (Development)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

เปิด http://localhost:5173

---

## รัน Backend (Development)

ต้องมี **PostgreSQL** บนเครื่อง (เครื่องคุณมี PG 15 ที่ port **5432** และ PG 17 ที่ port **5433**)

### วิธีง่าย (แนะนำ)

```powershell
cd "c:\Users\User\OneDrive\Desktop\PortfolioPro Studio"
.\scripts\setup-local-dev.ps1
```

สคริปต์จะถามรหัสผ่าน PostgreSQL → สร้าง database `portfoliopro` → สร้าง `backend\.env` → รัน API

### วิธี manual

```bash
# สร้าง database (ใน psql หรือ pgAdmin)
CREATE DATABASE portfoliopro;

cd backend
cp .env.example .env
# แก้ DB_PASSWORD ใน .env ให้ตรงกับรหัส postgres ของคุณ

go mod download
go run main.go
```

API ทำงานที่ http://localhost:8080 — ทดสอบ: http://localhost:8080/api/health

---

## Deploy Frontend → Vercel

1. Push โค้ดขึ้น GitHub
2. ไปที่ [vercel.com](https://vercel.com) → Import Repository
3. ตั้งค่า:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
4. Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://portfoliopro-api.onrender.com` (URL จาก Render) |
| `VITE_SITE_URL` | `https://portfoliopro.studio` |
| `VITE_GA_ID` | Google Analytics ID (ถ้ามี) |
| `VITE_CLARITY_ID` | Microsoft Clarity ID (ถ้ามี) |

5. Deploy → ชี้ domain `portfoliopro.studio` ใน Vercel DNS

---

## Deploy Backend → Render

### วิธีที่ 1: Blueprint (แนะนำ)

1. Push โค้ดขึ้น GitHub
2. ไปที่ [render.com](https://render.com) → **New** → **Blueprint**
3. เชื่อม GitHub repo → Render จะสร้าง API + PostgreSQL จาก `render.yaml` อัตโนมัติ
4. คัดลอก URL ของ API ไปใส่ `VITE_API_URL` ใน Vercel

### วิธีที่ 2: Manual

1. สร้าง **PostgreSQL** database บน Render
2. สร้าง **Web Service** (Runtime: Go, Root: `backend`)
   - Build: `go build -o server .`
   - Start: `./server`
3. ตั้ง Environment Variables จาก `backend/.env.example`

---

## Push ขึ้น GitHub

```bash
git init
git add .
git commit -m "Initial commit: PortfolioPro Studio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/portfoliopro-studio.git
git push -u origin main
```

---

## SEO & Analytics

หลัง deploy แล้ว:

1. **Google Search Console** — ส่ง sitemap: `https://portfoliopro.studio/sitemap.xml`
2. **Google Analytics 4** — สร้าง property แล้วใส่ `VITE_GA_ID` ใน Vercel
3. **Microsoft Clarity** — สร้าง project แล้วใส่ `VITE_CLARITY_ID` ใน Vercel

---

## แก้ข้อมูลติดต่อ

แก้ที่ไฟล์เดียว: `frontend/src/config/site.js`

- อีเมล, เบอร์โทร, Line OA
- ลิงก์ Facebook / Instagram

---

---

## ระบบชำระเงิน (โอนเงินแนบสลิป)

ลูกค้าโอนผ่าน PromptPay / บัญชีธนาคาร แล้วอัปโหลดสลิปในระบบ แอดมินตรวจสลิปแล้วกดยืนยันคำสั่งซื้อ

### ตั้งค่าบัญชีรับเงิน

ใส่ใน `backend/.env` หรือแก้ที่ **Admin → ตั้งค่าเว็บ**:

```
PROMPTPAY_PHONE=0645238150
BANK_NAME=พร้อมเพย์
BANK_ACCOUNT_NAME=PortfolioPro Studio
BANK_ACCOUNT_NUMBER=0645238150
```

ไฟล์สลิปเก็บที่ `backend/uploads/slips/` (ไม่ commit ขึ้น git)

### ขั้นตอนทดสอบ

1. ลูกค้าใส่ตะกร้า → ชำระเงิน → สแกน QR / โอนตามยอด
2. อัปโหลดสลิป (JPG, PNG, WEBP สูงสุด 5MB)
3. แอดมินเปิด **คำสั่งซื้อ** → ดูสลิป → กด **ยืนยันการสั่งซื้อ** หรือ **ปฏิเสธสลิป**

---

## API Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | ไม่ต้อง |
| POST | `/api/auth/register` | ไม่ต้อง |
| POST | `/api/auth/login` | ไม่ต้อง |
| GET | `/api/auth/me` | JWT |
| POST | `/api/quotations` | JWT |
| POST | `/api/contact` | ไม่ต้อง |
| POST | `/api/payments` | JWT — สร้าง QR PromptPay |
| GET | `/api/payments/:id/status` | JWT — ตรวจสอบการชำระ |
