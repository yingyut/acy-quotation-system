import { prisma } from '@/lib/prisma';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT_PDF'
  | 'PRINT'
  | 'CANCEL'
  | 'STATUS_CHANGE'
  | 'PAYMENT'
  | 'LOGIN'
  | 'IMPORT';

export interface AuditLogInput {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/** Writes an immutable audit trail entry (spec section 24). There is
 *  intentionally no update/delete API for audit_logs anywhere in the app. */
export async function writeAuditLog(input: AuditLogInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue === undefined ? undefined : JSON.parse(JSON.stringify(input.oldValue)),
      newValue: input.newValue === undefined ? undefined : JSON.parse(JSON.stringify(input.newValue)),
    },
  });
}
