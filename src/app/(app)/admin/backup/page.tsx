import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { listBackupFiles } from '@/lib/actions/backup';
import { TriggerBackupButton, RestoreButton } from '@/components/BackupActions';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function BackupPage() {
  await requirePermission(PERMISSIONS.BACKUP_MANAGE);
  const [files, recentLogs] = await Promise.all([
    listBackupFiles(),
    prisma.backup.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { triggeredBy: true } }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Backup / Restore</h1>
        <p className="text-sm text-gray-500">
          สำรองข้อมูลอัตโนมัติทุกวัน (ดูตารางเวลาได้จากตัวแปร BACKUP_CRON) และสำรองด้วยตนเองได้ที่นี่
          ไฟล์ Backup ประกอบด้วยฐานข้อมูลทั้งหมดและไฟล์แนบ (รูปสินค้า, PDF) — ย้ายไปเครื่องใหม่ได้ทันที
        </p>
      </div>

      <div className="card">
        <TriggerBackupButton />
      </div>

      <div className="card space-y-2">
        <h2 className="font-medium text-gray-800">ไฟล์ Backup ({files.length})</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>ไฟล์</th>
              <th>วันที่สร้าง</th>
              <th className="text-right">ขนาด</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400">
                  ยังไม่มีไฟล์ Backup
                </td>
              </tr>
            )}
            {files.map((f) => (
              <tr key={f.fileName}>
                <td className="font-mono text-xs">{f.fileName}</td>
                <td>{f.createdAt.toLocaleString('th-TH')}</td>
                <td className="text-right">{formatBytes(f.sizeBytes)}</td>
                <td>
                  <RestoreButton fileName={f.fileName} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card space-y-2">
        <h2 className="font-medium text-gray-800">Log ผลการ Backup</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>ประเภท</th>
              <th>สถานะ</th>
              <th>ผู้สั่งการ</th>
              <th>ข้อผิดพลาด</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  ยังไม่มีประวัติ
                </td>
              </tr>
            )}
            {recentLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt.toLocaleString('th-TH')}</td>
                <td>{log.type}</td>
                <td>
                  <span
                    className={`badge ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {log.status}
                  </span>
                </td>
                <td>{log.triggeredBy?.username ?? 'ระบบอัตโนมัติ'}</td>
                <td className="text-xs text-red-600">{log.errorMessage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
