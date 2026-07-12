# คู่มือติดตั้งบน Windows 10 / 11 / Windows Server

## 1. ข้อกำหนดเบื้องต้น

- Windows 10/11 (64-bit) หรือ Windows Server 2019+
- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) ติดตั้งและเปิดใช้งานแล้ว (แนะนำ WSL2 backend)
- พื้นที่ว่างอย่างน้อย 5 GB
- สิทธิ์ Administrator สำหรับการติดตั้งครั้งแรก

## 2. ขั้นตอนติดตั้ง

1. ดาวน์โหลดหรือ Clone โปรเจกต์นี้ไปยังเครื่องที่จะใช้เป็นเซิร์ฟเวอร์ เช่น `C:\ACY-Quotation`

2. เปิด Docker Desktop และรอจนสถานะเป็น "Running" (ไอคอนวาฬที่ System Tray)

3. เปิด PowerShell หรือ Command Prompt ที่โฟลเดอร์โปรเจกต์:

   ```powershell
   cd C:\ACY-Quotation
   copy .env.example .env
   ```

4. แก้ไขไฟล์ `.env` ด้วย Notepad หรือโปรแกรมแก้ไขข้อความ:
   - ตั้ง `POSTGRES_PASSWORD` เป็นรหัสผ่านที่รัดกุม
   - สร้าง `NEXTAUTH_SECRET` ใหม่ (เปิด PowerShell แล้วรัน `[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))` หรือใช้เว็บสร้าง Random String 32+ ตัวอักษร)
   - หากต้องการให้เครื่องอื่นในวง LAN เข้าใช้งานได้ ให้แก้ `NEXTAUTH_URL` เป็น `http://<IP เครื่องนี้>:8090` เช่น `http://192.168.1.50:8090`

5. ตรวจสอบว่าพอร์ต 8090 และ 5433 ว่างอยู่ (ไม่ถูกโปรแกรมอื่นใช้งาน):

   ```powershell
   Get-NetTCPConnection -LocalPort 8090,5433 -ErrorAction SilentlyContinue
   ```

   หากมีโปรแกรมอื่นใช้พอร์ตเหล่านี้อยู่ ให้แก้ `HOST_PORT` และ/หรือ `POSTGRES_PORT` ใน `.env` เป็นพอร์ตอื่นที่ว่าง (ดูหัวข้อ "หากพอร์ตชนกัน" ด้านล่าง)

6. สั่งให้ระบบเริ่มทำงาน:

   ```powershell
   docker compose up -d
   ```

   ครั้งแรกจะใช้เวลาประมาณ 2-5 นาทีในการ Build และดาวน์โหลด Image ครั้งต่อไปจะเร็วขึ้นมาก

7. ตรวจสอบว่าทุก Container ทำงานปกติ:

   ```powershell
   docker compose ps
   ```

   ควรเห็นสถานะ `Up` หรือ `Up (healthy)` สำหรับทุก Service (`db`, `app`, `nginx`, `backup`)

8. เปิดเบราว์เซอร์ไปที่ `http://localhost:8090` (หรือ `http://<IP เครื่องเซิร์ฟเวอร์>:8090` จากเครื่องอื่น) แล้วเข้าสู่ระบบด้วยบัญชี Admin เริ่มต้น (ดู [README](../README.md#3-บัญชีผู้ใช้เริ่มต้น-default-accounts))

## 3. หากพอร์ตชนกัน

หากเครื่องมี PostgreSQL หรือบริการอื่นใช้พอร์ต 5432/8080 อยู่แล้ว (พบได้บ่อยในเครื่องพัฒนา) ให้แก้ไข `.env`:

```env
POSTGRES_PORT=5434
HOST_PORT=8091
```

แล้วรัน `docker compose up -d` ใหม่ ระบบจะใช้พอร์ตใหม่ที่กำหนด (ไม่กระทบการทำงานภายใน Container)

## 4. ตั้งค่าให้เข้าถึงจากเครื่องอื่นในวง LAN

1. เปิด Windows Firewall ให้อนุญาต Inbound สำหรับพอร์ต 8090 (Docker Desktop มักขอสิทธิ์นี้อัตโนมัติเมื่อ Publish พอร์ตครั้งแรก หากไม่ขึ้น ให้เพิ่มกฎเองผ่าน Windows Defender Firewall → Advanced Settings → Inbound Rules)
2. หาที่อยู่ IP ของเครื่องเซิร์ฟเวอร์: `ipconfig` (ดูที่ IPv4 Address ของ Network Adapter ที่เชื่อมต่อ LAN)
3. เครื่องอื่นในวง LAN เข้าใช้งานผ่าน `http://<IP เครื่องเซิร์ฟเวอร์>:8090`
4. แนะนำให้ตั้ง IP เครื่องเซิร์ฟเวอร์เป็น Static IP เพื่อไม่ให้ที่อยู่เปลี่ยนหลัง Restart

## 5. ตั้งชื่อโดเมนภายใน (Optional)

หากต้องการใช้ชื่อ เช่น `http://quotation.acy.local` แทน IP ตรงๆ:

1. เพิ่มบรรทัดนี้ในไฟล์ `C:\Windows\System32\drivers\etc\hosts` **ของทุกเครื่องที่จะใช้งาน** (ต้องเปิด Notepad แบบ Run as Administrator):
   ```
   192.168.1.50   quotation.acy.local
   ```
   (แทน `192.168.1.50` ด้วย IP จริงของเซิร์ฟเวอร์)
2. หรือใช้ DNS Server ภายในองค์กร (ถ้ามี) เพิ่ม A Record ชี้ไปยัง IP เซิร์ฟเวอร์

## 6. คำสั่งที่ใช้บ่อย

```powershell
docker compose ps                    # ดูสถานะทุก Service
docker compose logs -f app           # ดู Log ของแอปพลิเคชันแบบ Real-time
docker compose restart app           # Restart เฉพาะแอปพลิเคชัน (ไม่กระทบฐานข้อมูล)
docker compose down                  # หยุดระบบทั้งหมด (ข้อมูลยังอยู่ใน Volume)
docker compose up -d                 # เริ่มระบบใหม่
docker compose up -d --build         # Build ใหม่หลังอัปเดต Code
```

> **คำเตือน:** ห้ามรัน `docker compose down -v` เว้นแต่ต้องการลบข้อมูลทั้งหมดถาวร (แฟล็ก `-v` จะลบ Volume ฐานข้อมูลและไฟล์แนบด้วย) หากต้องการล้างข้อมูลจริงๆ ให้ Backup ก่อนเสมอ (ดู [คู่มือ Backup](backup-guide.md))

## 7. อัปเดตระบบเป็นเวอร์ชันใหม่

```powershell
git pull                             # หรือคัดลอกไฟล์เวอร์ชันใหม่ทับ
docker compose build app
docker compose up -d
```

Migration ฐานข้อมูลจะรันอัตโนมัติเมื่อ Container `app` เริ่มทำงาน (ดูใน `docker compose logs app`)

## 8. Uninstall

```powershell
docker compose down          # หยุดระบบ (เก็บข้อมูลไว้)
docker compose down -v       # ลบระบบและข้อมูลทั้งหมดถาวร — สำรองข้อมูลก่อนเสมอ!
```
