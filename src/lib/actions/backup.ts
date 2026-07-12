'use server';

import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';

const execFileAsync = promisify(execFile);

const BACKUP_PATH = process.env.BACKUP_PATH ?? path.join(process.env.STORAGE_PATH ?? './storage', 'backups');

export async function triggerManualBackup() {
  const user = await assertPermission(PERMISSIONS.BACKUP_MANAGE);

  try {
    const { stdout } = await execFileAsync('sh', ['scripts/backup.sh', 'manual'], {
      cwd: process.cwd(),
      env: process.env,
      timeout: 120000,
    });

    const lastLine = stdout.trim().split('\n').pop() ?? '';
    const [fileName, sizeBytes] = lastLine.split('|');

    const record = await prisma.backup.create({
      data: {
        fileName: fileName || 'unknown',
        filePath: path.join(BACKUP_PATH, fileName || ''),
        sizeBytes: BigInt(sizeBytes || 0),
        type: 'MANUAL',
        status: 'SUCCESS',
        triggeredById: user.id,
      },
    });

    await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'Backup', entityId: record.id, newValue: { fileName } });
    revalidatePath('/admin/backup');
    return { success: true, fileName };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.backup.create({
      data: { fileName: '-', filePath: '-', type: 'MANUAL', status: 'FAILED', errorMessage, triggeredById: user.id },
    });
    revalidatePath('/admin/backup');
    throw new Error(`Backup ล้มเหลว: ${errorMessage}`);
  }
}

export interface BackupFileInfo {
  fileName: string;
  sizeBytes: number;
  createdAt: Date;
}

export async function listBackupFiles(): Promise<BackupFileInfo[]> {
  try {
    const files = await fs.readdir(BACKUP_PATH);
    const infos = await Promise.all(
      files
        .filter((f) => f.endsWith('.tar.gz'))
        .map(async (f) => {
          const stat = await fs.stat(path.join(BACKUP_PATH, f));
          return { fileName: f, sizeBytes: stat.size, createdAt: stat.mtime };
        }),
    );
    return infos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch {
    return [];
  }
}

export async function restoreFromBackup(fileName: string) {
  const user = await assertPermission(PERMISSIONS.BACKUP_MANAGE);
  const filePath = path.join(BACKUP_PATH, fileName);

  await execFileAsync('sh', ['scripts/restore.sh', filePath], {
    cwd: process.cwd(),
    env: process.env,
    timeout: 300000,
  });

  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'Backup', entityId: fileName, newValue: { restored: true } });
  revalidatePath('/admin/backup');
}
