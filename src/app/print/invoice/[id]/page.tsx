import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyPrintToken } from '@/lib/printToken';
import { hasPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { buildInvoicePrintData } from '@/lib/pdf/buildInvoicePrintData';
import { InvoicePrintDocument } from '@/components/print/InvoicePrintDocument';
import type { CopyType } from '@/lib/pdf/types';

const VALID_COPY_TYPES: CopyType[] = ['ORIGINAL', 'COPY_CUSTOMER', 'COPY_ACCOUNTING', 'COPY_WAREHOUSE', 'COPY_SALES'];

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { copy?: string; token?: string };
}) {
  const copyType = (VALID_COPY_TYPES.includes(searchParams.copy as CopyType) ? searchParams.copy : 'ORIGINAL') as CopyType;

  let authorized = false;
  if (searchParams.token) {
    const payload = verifyPrintToken(searchParams.token);
    if (payload && payload.docType === 'invoice' && payload.id === params.id) authorized = true;
  }
  if (!authorized) {
    const session = await getServerSession(authOptions);
    if (session?.user && hasPermission(session.user, PERMISSIONS.INVOICE_PRINT)) authorized = true;
  }
  if (!authorized) notFound();

  const data = await buildInvoicePrintData(params.id, copyType);
  return <InvoicePrintDocument data={data} />;
}
