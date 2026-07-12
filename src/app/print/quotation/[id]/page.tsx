import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyPrintToken } from '@/lib/printToken';
import { hasPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { buildQuotationPrintData } from '@/lib/pdf/buildQuotationPrintData';
import { QuotationPrintDocument } from '@/components/print/QuotationPrintDocument';
import type { CopyType } from '@/lib/pdf/types';

const VALID_COPY_TYPES: CopyType[] = ['ORIGINAL', 'COPY_CUSTOMER', 'COPY_ACCOUNTING', 'COPY_WAREHOUSE', 'COPY_SALES'];

export default async function QuotationPrintPage({
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
    if (payload && payload.docType === 'quotation' && payload.id === params.id) {
      authorized = true;
    }
  }

  if (!authorized) {
    const session = await getServerSession(authOptions);
    if (session?.user && hasPermission(session.user, PERMISSIONS.QUOTATION_EXPORT_PDF)) {
      authorized = true;
    }
  }

  if (!authorized) notFound();

  const data = await buildQuotationPrintData(params.id, copyType);
  return <QuotationPrintDocument data={data} />;
}
