import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { entityType?: string; action?: string };
}) {
  await requirePermission(PERMISSIONS.AUDIT_LOG_VIEW);

  const where: Prisma.AuditLogWhereInput = {
    ...(searchParams.entityType ? { entityType: searchParams.entityType } : {}),
    ...(searchParams.action ? { action: searchParams.action } : {}),
  };

  const [logs, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.auditLog.findMany({ distinct: ['entityType'], select: { entityType: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Audit Log</h1>
        <p className="text-sm text-gray-500">บันทึกการเปลี่ยนแปลงข้อมูลทั้งหมดในระบบ (แก้ไขหรือลบไม่ได้)</p>
      </div>

      <form className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">ประเภทข้อมูล</label>
          <select name="entityType" defaultValue={searchParams.entityType ?? ''} className="input w-48">
            <option value="">ทั้งหมด</option>
            {entityTypes.map((e) => (
              <option key={e.entityType} value={e.entityType}>
                {e.entityType}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">การกระทำ</label>
          <select name="action" defaultValue={searchParams.action ?? ''} className="input w-48">
            <option value="">ทั้งหมด</option>
            {['CREATE', 'UPDATE', 'DELETE', 'EXPORT_PDF', 'PRINT', 'CANCEL', 'STATUS_CHANGE', 'PAYMENT', 'LOGIN', 'IMPORT'].map(
              (a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ),
            )}
          </select>
        </div>
        <button className="btn-secondary">กรอง</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>วันที่/เวลา</th>
              <th>ผู้ใช้</th>
              <th>การกระทำ</th>
              <th>ประเภทข้อมูล</th>
              <th>รหัสอ้างอิง</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap">{log.createdAt.toLocaleString('th-TH')}</td>
                <td>{log.user?.username ?? '-'}</td>
                <td>
                  <span className="badge bg-gray-100 text-gray-700">{log.action}</span>
                </td>
                <td>{log.entityType}</td>
                <td className="font-mono text-xs">{log.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
