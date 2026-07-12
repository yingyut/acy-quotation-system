import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { DocType, ResetPolicy } from '@prisma/client';

interface SequenceConfig {
  prefix: string;
  useYearBE: boolean;
  useYearCE: boolean;
  useMonth: boolean;
  useDay: boolean;
  runningDigits: number;
  resetPolicy: ResetPolicy;
  separator: string;
}

// Defaults chosen to match the examples in spec section 14, e.g.
// "QT-ACY-2026-0001", "INV-ACY-2026-0001". Fully editable per docType
// from Admin > Document Number Settings (updates the live template row).
export const DEFAULT_SEQUENCE_CONFIG: Record<DocType, SequenceConfig> = {
  QUOTATION: base('QT-ACY'),
  SALES_ORDER: base('SO-ACY'),
  DELIVERY_NOTE: base('DN-ACY'),
  INVOICE: base('INV-ACY'),
  TAX_INVOICE: base('TAX-ACY'),
  RECEIPT: base('RC-ACY'),
  RECEIPT_TAX_INVOICE: base('RCTAX-ACY'),
  CREDIT_NOTE: base('CN-ACY'),
  DEBIT_NOTE: base('DBN-ACY'),
};

function base(prefix: string): SequenceConfig {
  return {
    prefix,
    useYearBE: false,
    useYearCE: true,
    useMonth: false,
    useDay: false,
    runningDigits: 4,
    resetPolicy: 'YEARLY',
    separator: '-',
  };
}

function computePeriodKey(config: SequenceConfig, now: Date): string {
  if (config.resetPolicy === 'NEVER') return 'ALL';
  const year = config.useYearBE ? now.getFullYear() + 543 : now.getFullYear();
  if (config.resetPolicy === 'MONTHLY') {
    return `${year}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return String(year);
}

function formatDocNumber(config: SequenceConfig, now: Date, runningNumber: number): string {
  const parts = [config.prefix];
  if (config.useYearBE) parts.push(String(now.getFullYear() + 543));
  else if (config.useYearCE) parts.push(String(now.getFullYear()));
  if (config.useMonth) parts.push(String(now.getMonth() + 1).padStart(2, '0'));
  if (config.useDay) parts.push(String(now.getDate()).padStart(2, '0'));
  parts.push(String(runningNumber).padStart(config.runningDigits, '0'));
  return parts.join(config.separator);
}

export interface GenerateDocNumberOptions {
  branchId?: string;
  salespersonId?: string;
  now?: Date;
}

/**
 * Atomically issues the next document number for a docType (+ optional
 * branch/salesperson scope). Uses a single `INSERT ... ON CONFLICT DO
 * UPDATE ... RETURNING` statement so concurrent requests from multiple
 * users on the LAN can never receive the same number (spec section 14:
 * "ป้องกันเลขซ้ำ"). Numbers, once issued, are never reused even if the
 * owning document is later cancelled.
 */
export async function generateDocNumber(
  docType: DocType,
  options: GenerateDocNumberOptions = {},
): Promise<string> {
  const branchId = options.branchId ?? '';
  const salespersonId = options.salespersonId ?? '';
  const now = options.now ?? new Date();

  const template = await prisma.documentSequence.findFirst({
    where: { docType, branchId, salespersonId },
    orderBy: { updatedAt: 'desc' },
  });

  const config: SequenceConfig = template
    ? {
        prefix: template.prefix,
        useYearBE: template.useYearBE,
        useYearCE: template.useYearCE,
        useMonth: template.useMonth,
        useDay: template.useDay,
        runningDigits: template.runningDigits,
        resetPolicy: template.resetPolicy,
        separator: template.separator,
      }
    : DEFAULT_SEQUENCE_CONFIG[docType];

  const periodKey = computePeriodKey(config, now);
  const id = randomUUID();

  const rows = await prisma.$queryRaw<{ current_number: number }[]>`
    INSERT INTO document_sequences (
      id, "docType", "branchId", "salespersonId", prefix,
      "useYearBE", "useYearCE", "useMonth", "useDay",
      "runningDigits", "resetPolicy", separator, "periodKey",
      "currentNumber", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${docType}::"DocType", ${branchId}, ${salespersonId}, ${config.prefix},
      ${config.useYearBE}, ${config.useYearCE}, ${config.useMonth}, ${config.useDay},
      ${config.runningDigits}, ${config.resetPolicy}::"ResetPolicy", ${config.separator}, ${periodKey},
      1, now(), now()
    )
    ON CONFLICT ("docType", "branchId", "salespersonId", "periodKey")
    DO UPDATE SET "currentNumber" = document_sequences."currentNumber" + 1, "updatedAt" = now()
    RETURNING "currentNumber" as current_number;
  `;

  const runningNumber = Number(rows[0].current_number);
  const docNumber = formatDocNumber(config, now, runningNumber);

  await prisma.documentSequence.updateMany({
    where: { docType, branchId, salespersonId, periodKey },
    data: { lastDocNumber: docNumber },
  });

  return docNumber;
}
