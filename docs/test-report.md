# Test Report

วันที่ทดสอบ: 2026-07-12
สภาพแวดล้อม: Docker Compose (db + app + nginx + backup), Windows 11 host, Docker Desktop

## 1. Unit Tests (Vitest)

คำสั่ง: `npm test`

```
✓ tests/calc.test.ts (12 tests)
  ✓ calcLineItem > computes base amount, discount and line total for a product row
  ✓ calcLineItem > supports a flat discount amount instead of percent
  ✓ calcLineItem > never lets discount exceed the line amount
  ✓ calcLineItem > text and heading rows carry no monetary value
  ✓ calcQuotationTotals > matches the worked example: cost/profit/GP/discount/VAT/net
  ✓ calcQuotationTotals > handles a quotation with no VAT/WHT and zero cost gracefully
  ✓ evaluateApprovalRequirement > flags low GP for approval
  ✓ evaluateApprovalRequirement > flags excessive discount for approval
  ✓ evaluateApprovalRequirement > does not require approval when within thresholds
  ✓ bahtText > converts whole numbers correctly
  ✓ bahtText > handles satang (decimal) correctly
  ✓ bahtText > handles a realistic quotation total

Test Files  1 passed (1)
     Tests  12 passed (12)
```

**ผลลัพธ์: PASSED (12/12)**

## 2. Integration Test: Full Document Chain

สคริปต์: `scripts/e2e-document-chain.ts` (ขับเคลื่อนผ่าน Puppeteer จำลองผู้ใช้จริงในเบราว์เซอร์)

ทดสอบ: Login → เปิดใบเสนอราคาทดสอบ → แปลงเป็นใบสั่งขาย → สร้างใบส่งสินค้า → สร้างใบแจ้งหนี้ → บันทึกรับชำระเงินเต็มจำนวน → ตรวจสอบใบเสร็จถูกสร้างอัตโนมัติ → Export PDF ของใบเสนอราคา (ต้นฉบับ+สำเนา), ใบแจ้งหนี้, และใบเสร็จ ตรวจสอบว่าเป็นไฟล์ PDF ที่ถูกต้อง

```
=== E2E DOCUMENT CHAIN TEST: PASSED ===
  - login OK
  - opened quotation detail
  - created sales order: http://.../sales-orders/...
  - created delivery note: http://.../delivery-notes/...
  - created invoice: http://.../invoices/...
  - recorded payment of 722800
  - receipt created: /receipts/...
  - quotation PDF OK (288287 bytes)
  - invoice PDF OK (278355 bytes)
  - receipt PDF OK (279853 bytes)
```

**ผลลัพธ์: PASSED** — ครอบคลุม Acceptance Criteria ข้อ 1, 4, 6, 13, 14, 15

## 3. Integration Test: Role-Based Access Control

สคริปต์: `scripts/e2e-rbac-check.ts`

```
=== RBAC INTEGRATION TEST: PASSED ===
  - sales1 logged in
  - confirmed: Sales cannot see product cost column
  - confirmed: Sales is forbidden from user administration
  - account1 logged in
  - confirmed: Accounting can open the invoices list
  - confirmed: Accounting does not see quotation cost (not granted by default role)
```

**ผลลัพธ์: PASSED** — ยืนยันว่า Sales มองไม่เห็นราคาทุน (Acceptance Criteria ข้อ 5) และ Accounting ใช้งานเอกสารบัญชีได้ตามสิทธิ์ที่กำหนด (สเปกส่วนที่ 7)

## 4. Integration Test: Document Number Uniqueness Under Concurrency

สคริปต์: `scripts/e2e-doc-number-uniqueness.ts`

ยิงคำขอ `generateDocNumber('QUOTATION')` พร้อมกัน 50 รายการ (จำลองพนักงานหลายคนกดสร้างใบเสนอราคาพร้อมกันในเวลาเดียวกัน):

```
=== DOC NUMBER UNIQUENESS TEST: PASSED ===
  - Generated 50 concurrent quotation numbers, all unique.
  - First: QT-ACY-2026-0002
  - Last:  QT-ACY-2026-0051
```

**ผลลัพธ์: PASSED** — ไม่มีเลขที่เอกสารซ้ำแม้แต่รายการเดียว (Acceptance Criteria ข้อ 11) กลไกใช้ `INSERT ... ON CONFLICT DO UPDATE` แบบ Atomic ระดับฐานข้อมูล

## 5. PDF Export: ภาษาไทยและการแบ่งหน้าอัตโนมัติ

ทดสอบด้วยใบเสนอราคาตัวอย่าง 41 รายการ (สร้างอัตโนมัติโดย `prisma/seed.ts` → `seedMultiPagePdfTestQuotation`) ตรวจสอบด้วย `pdfinfo`/`pdftotext` (poppler-utils) และแปลงเป็นภาพเพื่อตรวจสอบด้วยสายตา:

| รายการตรวจสอบ | ผลลัพธ์ |
|---|---|
| ขนาดกระดาษ | A4 (595.92 x 842.88 pts) ✓ |
| จำนวนหน้าที่แบ่งอัตโนมัติ | 4 หน้า (ตรงตามปริมาณเนื้อหา) ✓ |
| ตัวอักษรภาษาไทยเรนเดอร์ถูกต้อง | ใช่ ไม่มีตัวอักษรแตก/ซ้อน/เป็นภาษาต่างดาว (ทดสอบด้วยฟอนต์ Sarabun ที่ฝังในระบบ) ✓ |
| Logo/ชื่อบริษัท/เลขที่เอกสาร/ชื่อลูกค้าแสดงทุกหน้า | ใช่ (ผ่าน Puppeteer header template ที่ทำงานอิสระจากการแบ่งหน้าของเนื้อหา) ✓ |
| หัวตารางคอลัมน์ (ลำดับ/รหัส/รายละเอียด/จำนวน/หน่วย/ราคา/ส่วนลด/รวมเงิน) ซ้ำทุกหน้า | ใช่ (CSS `display: table-header-group`) ✓ |
| เลขหน้า "หน้า X / Y" | ใช่ ถูกต้องทุกหน้า (1/4, 2/4, 3/4, 4/4) ✓ |
| ยอดรวม/ส่วนลด/VAT/หัก ณ ที่จ่าย/ยอดสุทธิ | อยู่หน้าสุดท้ายเท่านั้น ✓ |
| ลายเซ็นผู้จัดทำ/ผู้อนุมัติ | อยู่หน้าสุดท้ายเท่านั้น ✓ |
| จำนวนเงินเป็นตัวอักษรภาษาไทย | ถูกต้อง (ตรวจสอบ 722,800.00 → "เจ็ดแสนสองหมื่นสองพันแปดร้อยบาทถ้วน") ✓ |
| รายการ LUMP_SUM ซ่อนราคาต่อหน่วย | แสดง "-" แทนราคา ✓ |
| รายการ TEXT ไม่มีเลขลำดับ ไม่คิดราคา | ถูกต้อง ✓ |
| ต้นฉบับ/สำเนา รวมในไฟล์เดียว | ทดสอบ `copies=ORIGINAL,COPY_ACCOUNTING` ได้ไฟล์ PDF รวม 2 ชุดสำเร็จ พร้อมข้อความ "ต้นฉบับ/ORIGINAL" และ "สำเนา/COPY" กำกับแต่ละชุด ✓ |

**ผลลัพธ์: PASSED ทุกข้อ** — ครอบคลุม Acceptance Criteria ข้อ 6, 7, 8, 9, 10, 15

> หมายเหตุ: ระหว่างการพัฒนาพบและแก้ไขบั๊ก 2 จุดในระบบ PDF: (1) Middleware ปิดกั้นหน้า print ก่อนระบบ token-based auth จะทำงาน ทำให้ PDF ที่ได้เป็นหน้า Login แทนเอกสารจริง — แก้โดยยกเว้น path `/print/*` ออกจาก Middleware auth (ยังคงตรวจสอบสิทธิ์ผ่าน signed token ภายในหน้า print เอง) (2) `<thead>` ที่มีเนื้อหาซับซ้อน (Logo + ข้อมูลบริษัท + ข้อมูลลูกค้า) ไม่ถูกทำซ้ำโดย Puppeteer printToPDF แม้จะใช้ `display: table-header-group` ถูกต้อง — แก้โดยย้ายเนื้อหาส่วนนี้ไปใช้ Puppeteer `headerTemplate` (รันซ้ำทุกหน้าโดยกลไกของ Puppeteer เอง) และเหลือเฉพาะหัวตารางคอลัมน์แบบเรียบง่ายไว้ใน `<thead>` ซึ่งทำงานถูกต้อง

## 6. Backup & Restore

| ขั้นตอน | ผลลัพธ์ |
|---|---|
| Backup อัตโนมัติ (Container `backup`, cron) | ทำงานสำเร็จ สร้างไฟล์ `.tar.gz` ตามกำหนดเวลา ✓ |
| Backup ด้วยตนเองผ่าน `scripts/backup.sh manual` | สำเร็จ ✓ |
| Restore ด้วย `scripts/restore.sh` จากไฟล์ Backup จริง | สำเร็จ ข้อมูล (รวมถึงใบเสนอราคาทดสอบ) ยังอยู่ครบหลัง Restore และตรวจสอบผ่านหน้าเว็บแล้ว ✓ |

> หมายเหตุ: พบและแก้ไขบั๊ก crash-loop ใน Container `backup` — `crond` (busybox) รันเป็น PID 1 โดยตรงทำให้เกิด `setpgid: Operation not permitted` และ Container Restart วนซ้ำ แก้โดยเพิ่ม `init: true` ใน `docker-compose.yml` (ใช้ Docker's built-in tini เป็น PID 1)

## 7. Fresh Install Validation (Zero-Touch)

ทดสอบด้วย Docker Compose Project แยกต่างหาก (`db` + `app` เท่านั้น, Volume ใหม่ทั้งหมด) เพื่อจำลองการติดตั้งครั้งแรกบนเครื่องใหม่ทุกประการ:

```
[wait-for-db] Database reachable at db:5432
Applying migration `20260712000000_init`
Applying migration `20260712010000_doc_sequence_scope_not_null`
All migrations have been successfully applied.
[seed] No users found, running seed script...
Seeded 31 permissions and 5 roles.
Seeded 5 users.
Seeded company: ACY SYSTEMS AND NETWORK CO., LTD.
Seeded 5 document templates.
Seeded default settings.
Seeded 3 sample customers.
Seeded 5 sample products.
Seeded sample document chain: QT-ACY-2026-0001 -> SO-ACY-2026-0001 -> DN-ACY-2026-0001 -> INV-ACY-2026-0001 -> RC-ACY-2026-0001
Seeded multi-page PDF test quotation: QT-ACY-2026-0002 (41 line items, expect 4 pages).
 ✓ Ready in 148ms
```

**ผลลัพธ์: PASSED** — `docker compose up -d` เพียงคำสั่งเดียวพา Migration + Seed ข้อมูลเริ่มต้น + ข้อมูลตัวอย่างทำงานสำเร็จโดยไม่ต้องมีขั้นตอนเพิ่มเติมใดๆ (Acceptance Criteria ข้อ 17, 19, 20)

## 8. Production Build

```
npm run build
✓ Compiled successfully
✓ Checking validity of types
✓ Generating static pages (35/35)
```

**ผลลัพธ์: PASSED** — ไม่มี TypeScript Error, ทุกหน้า (35 routes) Build สำเร็จ

## สรุป

| หมวด | สถานะ |
|---|---|
| Unit Tests (สูตรคำนวณ) | ✅ PASSED 12/12 |
| Integration: Document Chain | ✅ PASSED |
| Integration: RBAC | ✅ PASSED |
| Integration: Doc Number Uniqueness | ✅ PASSED |
| PDF: ภาษาไทย + แบ่งหน้าอัตโนมัติ | ✅ PASSED |
| Backup & Restore | ✅ PASSED |
| Fresh Install (Zero-Touch) | ✅ PASSED |
| Production Build | ✅ PASSED |

ระบบผ่านเกณฑ์ Acceptance Criteria ที่ทดสอบได้อัตโนมัติทั้งหมดตามสเปกส่วนที่ 33
