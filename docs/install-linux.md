# คู่มือติดตั้งบน Linux Server / Mini PC / NAS

รองรับ Ubuntu, Debian, และ NAS ที่มี Docker (Synology DSM 7+, QNAP QTS ที่มี Container Station เป็นต้น)

## 1. ข้อกำหนดเบื้องต้น

- Linux x86_64 (Ubuntu 20.04+/Debian 11+ แนะนำ) หรือ NAS ที่รองรับ Docker/Docker Compose v2
- Docker Engine 24+ และ Docker Compose plugin v2+
- พื้นที่ว่างอย่างน้อย 5 GB
- สิทธิ์ `sudo` หรือผู้ใช้ที่อยู่ใน กลุ่ม `docker`

ติดตั้ง Docker (Ubuntu/Debian) หากยังไม่มี:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# ออกจากระบบแล้วเข้าใหม่เพื่อให้สิทธิ์กลุ่ม docker มีผล
```

## 2. ขั้นตอนติดตั้ง

```bash
git clone <this-repo> /opt/acy-quotation
cd /opt/acy-quotation
cp .env.example .env
```

แก้ไข `.env`:

```bash
nano .env
```

- ตั้ง `POSTGRES_PASSWORD` เป็นรหัสผ่านที่รัดกุม
- สร้าง `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- แก้ `NEXTAUTH_URL` เป็น `http://<IP เครื่องเซิร์ฟเวอร์>:8090`

ตรวจสอบว่าพอร์ต 8090/5433 ว่างอยู่:

```bash
sudo ss -tulpn | grep -E ':8090|:5433'
```

หากไม่ว่าง ให้แก้ `HOST_PORT` / `POSTGRES_PORT` ใน `.env` เป็นพอร์ตอื่น

เริ่มระบบ:

```bash
docker compose up -d
docker compose ps
```

ตรวจสอบ Log หากมี Container ใดไม่ Healthy:

```bash
docker compose logs -f app
```

เข้าใช้งานที่ `http://<IP เครื่องเซิร์ฟเวอร์>:8090`

## 3. ตั้งค่า Firewall (ufw ตัวอย่าง Ubuntu)

```bash
sudo ufw allow 8090/tcp
sudo ufw status
```

**อย่าเปิดพอร์ต 5433 (ฐานข้อมูล) ออกสู่ Internet** — ระบบนี้ออกแบบให้ใช้งานภายใน LAN เท่านั้น หากต้องการใช้งานนอกบริษัทให้เชื่อมผ่าน VPN (เช่น WireGuard, Tailscale) แทนการเปิดพอร์ตตรงออก Internet

## 4. รันเป็น systemd service (แนะนำสำหรับ Production Server)

สร้างไฟล์ `/etc/systemd/system/acy-quotation.service`:

```ini
[Unit]
Description=ACY Quotation System (Docker Compose)
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/acy-quotation
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

เปิดใช้งาน:

```bash
sudo systemctl enable --now acy-quotation.service
```

ระบบจะเริ่มทำงานอัตโนมัติทุกครั้งที่เซิร์ฟเวอร์ Boot

## 5. ติดตั้งบน NAS (Synology / QNAP)

1. เปิดใช้งาน Container Station (QNAP) หรือ Container Manager (Synology DSM 7.2+)
2. คัดลอกโฟลเดอร์โปรเจกต์ทั้งหมดไปยัง Shared Folder บน NAS (ผ่าน File Station หรือ SMB)
3. เปิด Terminal บน NAS (SSH) แล้วรันคำสั่งเช่นเดียวกับ Linux Server ด้านบน หรือ Import `docker-compose.yml` ผ่านหน้า GUI ของ Container Station/Manager
4. ตรวจสอบว่า NAS จัดสรร CPU/RAM เพียงพอสำหรับ Puppeteer/Chromium (แนะนำอย่างน้อย 2 vCPU / 4GB RAM)

## 6. คำสั่งที่ใช้บ่อย

```bash
docker compose ps
docker compose logs -f app
docker compose restart app
docker compose down            # หยุดระบบ (เก็บข้อมูล)
docker compose up -d --build   # Build ใหม่หลังอัปเดต Code
```

> **คำเตือน:** `docker compose down -v` จะลบข้อมูลถาวร ให้ Backup ก่อนเสมอ (ดู [คู่มือ Backup](backup-guide.md))

## 7. ย้ายระบบไป VPS / Cloud ในอนาคต

ระบบนี้ไม่ผูกกับ Infrastructure เฉพาะเจาะจง ย้ายไป VPS หรือ Cloud (เช่น DigitalOcean, AWS Lightsail, Google Cloud) ได้โดย:

1. Backup ข้อมูลจากเครื่องเดิม (ดู [คู่มือ Backup](backup-guide.md))
2. ติดตั้ง Docker บนเครื่องปลายทางตามขั้นตอนข้างต้น
3. คัดลอกโปรเจกต์ + ไฟล์ Backup ไปเครื่องใหม่
4. `docker compose up -d db` เพื่อสร้างฐานข้อมูลเปล่า แล้ว Restore (ดู [คู่มือ Restore](restore-guide.md))
5. เพิ่ม Reverse Proxy ที่รองรับ HTTPS (เช่น Caddy หรือ Nginx + Let's Encrypt) หน้า Nginx เดิม หรือแก้ `deploy/nginx.conf` เพิ่ม TLS โดยตรง (ระบบ HTTPS Ready ตามข้อกำหนดด้านความปลอดภัย)
