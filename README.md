# ACY Quotation & Accounting Document System

ระบบใบเสนอราคาและเอกสารบัญชี สำหรับ **บริษัท เอซีวาย ซิสเต็มส์แอนด์เน็ตเวิร์ค จำกัด (ACY SYSTEMS AND NETWORK CO., LTD.)**

Local Web Application ที่รันด้วย Docker Compose ใช้งานได้ทันทีบนเครือข่ายภายในบริษัท (LAN) รองรับผู้ใช้งานหลายคนพร้อมกัน ไม่ต้องพึ่งพา Internet หรือบริการ Cloud ที่มีค่าใช้จ่ายรายเดือน

---

## 1. สรุประบบ

ระบบครอบคลุม Workflow เต็มรูปแบบ:

```
Login → เลือกลูกค้า → เลือกสินค้า/บริการ → คำนวณต้นทุน/กำไร/GP/VAT
     → ส่งอนุมัติ → Preview PDF → Export PDF → ส่งลูกค้า → ลูกค้าตอบรับ
     → แปลงเป็นใบสั่งขาย → ใบส่งสินค้า → ใบแจ้งหนี้ → รับชำระเงิน
     → ใบเสร็จรับเงิน/ใบกำกับภาษี → พิมพ์ต้นฉบับและสำเนา
```

โมดูลที่ใช้งานได้จริงทั้งหมด (ไม่มี Mock / Placeholder):

- **Authentication & RBAC** — 5 บทบาท (Admin, Sales, Sales Manager, Accounting, Viewer) พร้อมระบบสิทธิ์แบบละเอียด (Permission-based) ที่ Admin ปรับได้
- **Company Settings** — โลโก้ ลายเซ็น ตราประทับ บัญชีธนาคาร สาขา เงื่อนไข Footer สีเอกสาร
- **Customers** — CRUD, ค้นหา, Import/Export Excel พร้อม Preview+Validation, ป้องกันเลขผู้เสียภาษีซ้ำ
- **Products** — CRUD, รูปภาพหลายรูป, Bullet Spec, Datasheet, ประวัติราคา, Import/Export Excel
- **Quotations** — รายการ 5 ประเภท (สินค้า/บริการ/ข้อความ/หัวข้อหมวด/เหมารวม), Drag-and-drop จัดเรียง, คำนวณ Real-time, Revision, Duplicate, Approval Workflow
- **Cost & Profit Engine** — คำนวณต้นทุน กำไร GP% Markup% ส่วนลด VAT หัก ณ ที่จ่าย ยอดสุทธิ พร้อมจำนวนเงินเป็นตัวอักษรภาษาไทย
- **PDF Export** — A4 ภาษาไทยเต็มรูปแบบ, ฝัง Font, แบ่งหน้าอัตโนมัติพร้อม Logo/เลขที่เอกสาร/ชื่อลูกค้า/หัวตารางซ้ำทุกหน้า, เลขหน้า, ต้นฉบับ/สำเนา (รวมหลายชุดในไฟล์เดียวได้)
- **Sales Order → Delivery Note → Invoice → Tax Invoice → Payment → Receipt** — Workflow เชื่อมต่อกันอัตโนมัติ ไม่ต้องกรอกซ้ำ
- **Document Numbering** — ตั้งค่า Prefix/ปี/เดือน/วัน/ Running Number ได้อิสระ ป้องกันเลขซ้ำแม้มีผู้ใช้หลายคนกดพร้อมกัน (ทดสอบด้วย 50 concurrent requests)
- **Dashboard & Reports** — ยอดขาย กำไร GP เฉลี่ย อัตราปิดการขาย ลูกหนี้ค้างชำระ สินค้าขายดี ลูกค้าหลัก ยอดขายรายเดือน/รายพนักงาน
- **Audit Log** — บันทึกทุกการสร้าง/แก้ไข/ลบ/Export/Print/เปลี่ยนสถานะ แก้ไขหรือลบไม่ได้
- **Backup & Restore** — Manual + Automatic (Cron), UI สั่ง Backup/Restore ได้จาก Admin, ย้ายไฟล์ไปเครื่องใหม่ได้ทันที

---

## 2. Quick Start

**ข้อกำหนดเบื้องต้น:** Docker Desktop (Windows/Mac) หรือ Docker Engine + Docker Compose plugin (Linux) — v2 ขึ้นไป

```bash
git clone <this-repo>
cd ACY-Quatation
cp .env.example .env
# แก้ไข .env: ตั้งรหัสผ่านฐานข้อมูล, NEXTAUTH_SECRET (openssl rand -base64 32), และรหัส Admin เริ่มต้นตามต้องการ

docker compose up -d
```

รอประมาณ 1-2 นาที (build image ครั้งแรก) ระบบจะ:
1. สร้างฐานข้อมูลและรัน Migration อัตโนมัติ
2. สร้างบัญชีผู้ใช้เริ่มต้น + ข้อมูลบริษัท ACY + Template เอกสาร 5 แบบ
3. สร้างข้อมูลตัวอย่าง (ลูกค้า, สินค้า, ใบเสนอราคาตัวอย่างพร้อมเอกสารครบชุด, ใบเสนอราคาทดสอบ PDF หลายหน้า)

เข้าใช้งานที่ **http://localhost:8090** (หรือ `http://<IP เครื่องเซิร์ฟเวอร์>:8090` จากเครื่องอื่นในวง LAN)

ดูรายละเอียดการติดตั้งเพิ่มเติม: [คู่มือติดตั้งบน Windows](docs/install-windows.md) · [คู่มือติดตั้งบน Linux](docs/install-linux.md)

---

## 3. บัญชีผู้ใช้เริ่มต้น (Default Accounts)

> **สำคัญ:** เปลี่ยนรหัสผ่านทันทีหลังติดตั้งจริง ผ่านเมนู "ชื่อผู้ใช้ (มุมขวาบน) → เปลี่ยนรหัสผ่านของฉัน" บัญชี `admin` ถูกตั้งค่าให้บังคับเปลี่ยนรหัสผ่านในการใช้งานจริงครั้งแรก

| Username     | Password         | บทบาท           | หมายเหตุ |
|--------------|------------------|------------------|----------|
| `admin`      | `Admin@12345`    | Administrator    | เห็นข้อมูลทั้งหมด จัดการผู้ใช้/สิทธิ์/ตั้งค่า |
| `sales1`     | `Sales@12345`    | Sales            | สร้างใบเสนอราคา **ไม่เห็นราคาทุน** |
| `salesmgr1`  | `SalesMgr@12345` | Sales Manager    | เห็นต้นทุน/กำไร/GP อนุมัติส่วนลด/ใบเสนอราคา |
| `account1`   | `Account@12345`  | Accounting       | ออกใบแจ้งหนี้/ใบกำกับภาษี/ใบเสร็จ บันทึกรับชำระ |
| `viewer1`    | `Viewer@12345`   | Viewer           | ดูอย่างเดียว |

เปลี่ยนบัญชี Admin เริ่มต้นได้ก่อนติดตั้งจริงผ่านตัวแปร `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_EMAIL` ใน `.env` (มีผลเฉพาะตอนฐานข้อมูลว่างครั้งแรกเท่านั้น)

---

## 4. Architecture

```
Browser (LAN)
    │  HTTP :8090
    ▼
Nginx (reverse proxy, gzip, upload size limit)
    │  :3000
    ▼
Next.js 14 (App Router) — single deployable
    ├─ Server Components + Server Actions (CRUD, business logic)
    ├─ Route Handlers (/api/*) — Excel import/export, PDF export, file serving
    ├─ NextAuth.js (Credentials + JWT session)
    └─ Puppeteer (headless Chromium, bundled in image) — HTML→PDF
    │  Prisma ORM
    ▼
PostgreSQL 16
    │
    ▼
Local disk volume (/app/storage) — product images, datasheets, backups
```

**เหตุผลที่เลือกสถาปัตยกรรมนี้** (ตามเกณฑ์ในสเปก: ใช้งานง่าย, ลดขั้นตอน, รองรับหลายคน, รองรับ LAN, ย้ายขึ้น Cloud ได้ในอนาคต, ปลอดภัย, Backup ง่าย, ไม่ผูกกับบริการเสียเงิน):

- **Next.js API Routes แทน NestJS แยก service** — Deploy เป็น Container เดียว ลดความซับซ้อนในการติดตั้งและ Backup สำหรับทีมขนาดเล็ก ยังคงแยก Layer ชัดเจนภายใน (`src/lib/actions`, `src/lib/pdf`, `src/lib/*`) ทำให้ย้ายไปสถาปัตยกรรมแยก service ในอนาคตทำได้ไม่ยาก
- **PostgreSQL + Prisma** — Transactional, รองรับ Migration ที่ตรวจสอบได้, มี Decimal type แม่นยำสำหรับตัวเลขเงิน
- **Puppeteer แทน third-party PDF SaaS** — ควบคุม Layout ได้เต็มที่ (แบ่งหน้า/หัวตารางซ้ำ/Font ไทย) และไม่ต้องพึ่ง Internet หรือบริการเสียเงิน
- **Local Disk Storage แทน MinIO** — ลดจำนวน Container ที่ต้องดูแลสำหรับ Deployment ขนาดเล็ก/กลาง ย้ายไป Object Storage ในอนาคตทำได้โดยแก้เฉพาะ `src/lib/storage.ts`
- **Nginx Reverse Proxy** — จุดเดียวสำหรับ TLS ในอนาคต (HTTPS Ready) และจำกัดขนาดไฟล์อัปโหลด

---

## 5. Assumptions & การตัดสินใจที่สำคัญ

เนื่องจากสเปกต้นฉบับไม่ได้ระบุรายละเอียดปลีกย่อยทุกจุด ระบบนี้ใช้ค่ามาตรฐานต่อไปนี้ (ปรับได้ทั้งหมดจากหน้า Admin หรือ `.env` โดยไม่ต้องแก้ Code):

| หัวข้อ | ค่าที่เลือกใช้ | เหตุผล |
|---|---|---|
| Port ฐานข้อมูล (host) | `5433` แทน `5432` | เครื่องพัฒนามี PostgreSQL อื่นครองพอร์ต 5432 อยู่แล้ว |
| Port เว็บ (host, ผ่าน Nginx) | `8090` แทน `8080` | พอร์ต 8080 มีบริการอื่นใช้งานอยู่บนเครื่องอ้างอิง |
| GP ขั้นต่ำก่อนต้องขออนุมัติ | 15% | ค่าเริ่มต้นทั่วไป ปรับได้ที่ Admin → ตั้งค่าใบเสนอราคา (Setting key `quotation.minGpPercent`) |
| ส่วนลดสูงสุดที่อนุมัติเองได้ | 15% | เช่นเดียวกับข้างต้น (`quotation.maxDiscountPercentWithoutApproval`) |
| กำไร/GP คำนวณจาก | ยอดขายก่อน VAT ลบต้นทุน | VAT เป็นภาษีที่เรียกเก็บแทนสรรพากร ไม่ใช่รายได้จริง จึงไม่รวมในกำไร |
| หัก ณ ที่จ่าย คำนวณจาก | มูลค่าหลังหักส่วนลด (ก่อน VAT) | มาตรฐานบัญชีไทยทั่วไป |
| รูปแบบเลขที่เอกสารเริ่มต้น | `QT-ACY-2026-0001` (ปี ค.ศ., เริ่มใหม่ทุกปี, 4 หลัก) | ตรงกับตัวอย่างในสเปกส่วนที่ 14 |
| Template เอกสาร 5 แบบ | Config เดียวกันแต่ปรับพารามิเตอร์ (Logo/สี/รูปสินค้า/Spec/Lump Sum) แทนการ Hard-code 5 หน้า HTML แยกกัน | Admin ปรับแต่ง Template ได้เองโดยไม่ต้องแก้ Code ตามข้อกำหนด "ไม่ควรให้ผู้ใช้แก้ HTML" |
| ส่งอีเมลใบเสนอราคา | เปิดหน้าต่าง `mailto:` พร้อมลิงก์ดาวน์โหลด PDF แนบให้อัตโนมัติ แทนการเชื่อมต่อ SMTP Server จริง | ระบบไม่มี SMTP Credential ที่ใช้งานได้จริงให้ตั้งค่า การใช้ `mailto:` ทำให้ฟีเจอร์ใช้งานได้จริงทันทีโดยไม่ต้อง Config เพิ่ม และเปิดโอกาสให้ผู้ใช้แก้ไขข้อความก่อนส่งจากอีเมลของตนเอง — หากต้องการส่งอัตโนมัติผ่าน SMTP จริง ให้เพิ่ม Nodemailer และตั้งค่า `SMTP_*` env variables (จุดขยายไว้ให้ที่ `src/components/QuotationActions.tsx`) |
| สถานะ "Viewed" (ลูกค้าเปิดดู) | ปรับสถานะได้ด้วยตนเอง เนื่องจากยังไม่มี Customer Portal (อยู่ใน Phase 4 ตามสเปก) | ยังไม่มีกลไก Tracking การเปิดอีเมล/ลิงก์จากลูกค้าโดยอัตโนมัติในเวอร์ชันนี้ |
| แก้ไขรายการในใบแจ้งหนี้/ใบสั่งขาย | คัดลอกรายการจากใบเสนอราคาต้นทาง แก้ไขได้เฉพาะข้อมูลหัวเอกสาร (วันที่/เงื่อนไข/หมายเหตุ) ไม่มีตัวแก้ไขรายการแยกต่างหาก | ลดความซับซ้อนของ UI ซ้ำซ้อนกับตัวแก้ไขใบเสนอราคา — ราคาที่ตกลงกันแล้วไม่ควรเปลี่ยนหลังส่งลูกค้า หากต้องแก้ไขราคาให้สร้าง Revision ใบเสนอราคาใหม่ |
| Multi-Company / Multi-Branch เต็มรูปแบบ | Schema รองรับหลายสาขา/หลายบัญชีธนาคารแล้ว แต่ UI สลับบริษัทหลายบริษัทยังไม่เปิดใช้ (Phase 4 ตามสเปก) | ตามลำดับความสำคัญที่สเปกกำหนดไว้ใน Phase 4 |

---

## 6. Environment Variables

ดูรายการเต็มพร้อมคำอธิบายใน [`.env.example`](.env.example) หัวข้อสำคัญ:

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `acy_admin` / *(ต้องตั้งเอง)* / `acy_quotation` | ข้อมูลฐานข้อมูล — **เปลี่ยนรหัสผ่านก่อนใช้งานจริงเสมอ** |
| `POSTGRES_PORT` | `5433` | พอร์ตฐานข้อมูลบน Host (สำหรับเชื่อมต่อด้วยเครื่องมือภายนอก) |
| `HOST_PORT` | `8090` | พอร์ตเว็บที่เปิดให้ใช้งานบน Host |
| `NEXTAUTH_URL` | `http://localhost:8090` | URL ที่ผู้ใช้เข้าถึงระบบ (แก้เป็น IP เครื่องเซิร์ฟเวอร์เมื่อใช้งานจริงบน LAN) |
| `NEXTAUTH_SECRET` | *(ต้องตั้งเอง)* | สร้างด้วย `openssl rand -base64 32` |
| `SESSION_MAX_AGE_MINUTES` | `480` | หมดอายุ Session อัตโนมัติ (8 ชั่วโมง) |
| `MAX_UPLOAD_SIZE_MB` | `15` | ขนาดไฟล์อัปโหลดสูงสุด |
| `DEFAULT_VAT_RATE` | `7` | อัตรา VAT เริ่มต้น |
| `BACKUP_RETENTION_DAYS` | `30` | จำนวนวันที่เก็บไฟล์ Backup อัตโนมัติ |
| `BACKUP_CRON` | `0 2 * * *` | เวลา Backup อัตโนมัติรายวัน (02:00 น.) |
| `SEED_ADMIN_USERNAME/PASSWORD/EMAIL` | `admin` / `Admin@12345` / `admin@acy.local` | บัญชี Admin ที่สร้างอัตโนมัติเมื่อฐานข้อมูลว่าง |

---

## 7. โครงสร้างโปรเจกต์

```
src/
  app/                    Next.js App Router — pages + API routes
    (app)/                หน้าที่ต้อง Login (Sidebar + Topbar layout)
    print/                หน้า Render สำหรับแปลงเป็น PDF (Puppeteer เข้าถึงผ่าน token)
    api/                  Route Handlers (Excel, PDF, ไฟล์แนบ, ค้นหา)
  components/             React Components (Client + Server)
  lib/
    actions/               Server Actions แยกตาม Module (customers, products, quotations, ...)
    pdf/                    Print data builders + Puppeteer PDF generation
    calc.ts                 Engine คำนวณต้นทุน/กำไร/GP/ส่วนลด/VAT (มี Unit Test)
    money.ts                 Decimal helpers + แปลงจำนวนเงินเป็นตัวอักษรภาษาไทย
    docNumber.ts              ระบบเลขที่เอกสาร (Atomic, กันเลขซ้ำ)
    auth.ts / rbac.ts          NextAuth config + Permission helpers
    storage.ts                จัดการไฟล์อัปโหลด
    permissions.ts             รายการสิทธิ์ + Default Role → Permission mapping
prisma/
  schema.prisma            Database Schema (35 ตาราง)
  migrations/               Migration history
  seed.ts                    Seed ข้อมูลเริ่มต้น + ตัวอย่าง
scripts/
  backup.sh / restore.sh      สคริปต์ Backup/Restore
  wait-for-db.js / run-seed-if-empty.js   Startup helper สำหรับ Docker
  e2e-*.ts                     Integration Tests (ดูหัวข้อ Testing)
tests/
  calc.test.ts               Unit Tests (Vitest) สำหรับสูตรคำนวณและจำนวนเงินภาษาไทย
docs/                      คู่มือติดตั้ง/Backup/Restore/ใช้งาน
deploy/                    Nginx config, Backup container Dockerfile
```

---

## 8. Testing

### Unit Tests (สูตรคำนวณ + จำนวนเงินภาษาไทย)

```bash
npm install
npm test
```

ครอบคลุม: คำนวณรายการ (ส่วนลด %/บาท), ยอดรวม/ส่วนลด/VAT/หัก ณ ที่จ่าย/สุทธิ/ต้นทุน/กำไร/GP/Markup, เกณฑ์ต้องขออนุมัติ, และการแปลงจำนวนเงินเป็นคำอ่านภาษาไทย (รวมกรณีหลักล้าน, เอ็ด, ยี่สิบ)

### Integration Tests (ต้องมีระบบรันอยู่แล้วผ่าน Docker)

รันจากภายใน Container `app` (มี Puppeteer พร้อมใช้):

```bash
docker compose exec app npx tsx scripts/e2e-document-chain.ts       # Quotation→SO→DN→Invoice→Payment→Receipt→PDF ครบวงจร
docker compose exec app npx tsx scripts/e2e-rbac-check.ts           # Sales มองไม่เห็นราคาทุน, Accounting ใช้งานเอกสารบัญชีได้
docker compose exec app npx tsx scripts/e2e-doc-number-uniqueness.ts # ยิง 50 คำขอเลขที่เอกสารพร้อมกัน ต้องไม่ซ้ำ
```

ผลการทดสอบล่าสุด (บันทึกไว้ใน [`docs/test-report.md`](docs/test-report.md)): **ผ่านทั้งหมด**

---

## 9. คู่มือเพิ่มเติม

- [คู่มือติดตั้งบน Windows](docs/install-windows.md)
- [คู่มือติดตั้งบน Linux](docs/install-linux.md)
- [คู่มือ Backup](docs/backup-guide.md)
- [คู่มือ Restore](docs/restore-guide.md)
- [คู่มือการใช้งาน](docs/user-manual.md)
- [Test Report](docs/test-report.md)

---

## 10. ข้อจำกัดที่ทราบอยู่แล้ว (Known Limitations)

- การส่งอีเมลใช้ `mailto:` (เปิดโปรแกรมอีเมลของผู้ใช้) แทนการส่งผ่าน SMTP Server อัตโนมัติ — ดูเหตุผลในหัวข้อ Assumptions
- ยังไม่มี Customer Portal ให้ลูกค้าดู/ตอบรับใบเสนอราคาออนไลน์ (กำหนดไว้ใน Phase 4)
- ยังไม่มี UI สลับหลายบริษัท (Multi-Company) แม้ Schema จะรองรับ — ระบบใช้บริษัทแรกที่พบในฐานข้อมูลเป็นบริษัทหลักเสมอ
- การแก้ไขรายการในใบสั่งขาย/ใบส่งสินค้า/ใบแจ้งหนี้ทำได้เฉพาะข้อมูลหัวเอกสาร รายการสินค้าคัดลอกมาจากใบเสนอราคาต้นทางเท่านั้น
- ยังไม่มี E-Signature (ลงชื่อดิจิทัลจริง) — ใช้รูปลายเซ็นที่ Admin อัปโหลดแทน

รายการทั้งหมดข้างต้นเป็นไปตามขอบเขต Phase 1-3 ในสเปก ส่วน Phase 4 (Multi-Company, Mobile App, Customer Portal, E-Signature, Cloud Deployment, API/Accounting Software Integration) ไว้เป็นแผนขยายในอนาคตตามที่สเปกกำหนด
