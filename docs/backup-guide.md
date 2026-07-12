# คู่มือ Backup

ระบบมี 3 วิธีในการสำรองข้อมูล — เลือกใช้ตามสถานการณ์

ไฟล์ Backup แต่ละไฟล์ (`acy_backup_YYYYMMDD_HHMMSS.tar.gz`) ประกอบด้วย:
- `database.sql` — Dump ฐานข้อมูล PostgreSQL ทั้งหมด (ลูกค้า, สินค้า, ใบเสนอราคา, เอกสารบัญชี, Audit Log, ผู้ใช้ ฯลฯ)
- `storage/uploads` — รูปสินค้า, โลโก้, ลายเซ็น, ตราประทับ, Datasheet, ไฟล์แนบทั้งหมด
- `storage/pdf` — PDF ที่เคย Export ไว้ (ถ้ามี)

ไฟล์นี้เป็น **Self-contained** — นำไปติดตั้งบนเครื่องใหม่ได้ทันทีโดยไม่ต้องพึ่งข้อมูลอื่น

## 1. Backup อัตโนมัติรายวัน

Container `backup` ทำงานอยู่เบื้องหลังตลอดเวลา และรัน Backup อัตโนมัติตามเวลาที่กำหนดใน `.env`:

```env
BACKUP_CRON=0 2 * * *          # ทุกวันเวลา 02:00 น. (รูปแบบ cron มาตรฐาน)
BACKUP_RETENTION_DAYS=30       # เก็บไฟล์ย้อนหลัง 30 วัน ไฟล์เก่ากว่านี้จะถูกลบอัตโนมัติ
```

ไฟล์ Backup จะถูกเก็บไว้ที่ Volume `storage` ในโฟลเดอร์ `backups/` — ดูรายการและ Log ผลลัพธ์ได้ที่หน้า **Admin → Backup / Restore** ในระบบ (ต้องมีสิทธิ์ Administrator)

ตรวจสอบว่า Backup อัตโนมัติทำงานถูกต้อง:

```bash
docker compose logs backup
```

## 2. Backup ด้วยตนเองผ่านหน้าเว็บ (แนะนำ)

1. เข้าสู่ระบบด้วยบัญชี Administrator
2. ไปที่เมนู **Backup / Restore**
3. กดปุ่ม **"สำรองข้อมูลตอนนี้ (Backup Now)"**
4. ระบบจะสร้างไฟล์ Backup ทันทีและแสดงผลลัพธ์ พร้อมบันทึกลง Log

## 3. Backup ด้วยคำสั่งจาก Terminal

```bash
docker compose exec app sh scripts/backup.sh manual
```

หรือรันจาก Container `backup` โดยตรง:

```bash
docker compose exec backup /app/scripts/backup.sh manual
```

## 4. ดาวน์โหลดไฟล์ Backup ออกจากเครื่อง

ไฟล์ Backup ทั้งหมดอยู่ใน Docker Volume `storage` (mount ที่ `/app/storage/backups` ภายใน Container) คัดลอกออกมาที่เครื่อง Host ได้ด้วย:

```bash
docker compose cp app:/app/storage/backups/. ./local-backups/
```

**แนะนำ:** ตั้งค่าให้คัดลอกไฟล์ในโฟลเดอร์ `local-backups/` ไปเก็บไว้อีกที่ (External Drive, NAS อื่น, หรือ Cloud Storage ส่วนตัว) เป็นระยะ เพื่อป้องกันกรณีเครื่อง/Disk หลักเสียหาย (3-2-1 Backup Rule)

## 5. ตรวจสอบผลการ Backup

หน้า **Admin → Backup / Restore** แสดง Log ผลการ Backup ทุกครั้ง (สำเร็จ/ล้มเหลว พร้อมข้อความ Error หากมี) — หาก Backup ล้มเหลวติดต่อกันหลายครั้ง ให้ตรวจสอบ:

```bash
docker compose logs backup --tail 50
docker compose exec db pg_isready -U acy_admin -d acy_quotation   # ตรวจสอบว่าฐานข้อมูลยังทำงานปกติ
df -h                                                              # ตรวจสอบพื้นที่ Disk เหลือเพียงพอ
```
