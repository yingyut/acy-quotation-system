import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyPrintToken } from '@/lib/printToken';
import { hasPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { buildReceiptPrintData } from '@/lib/pdf/buildReceiptPrintData';
import { DocumentRenderer, type RenderMode } from '@/components/print/DocumentRenderer';
import { decodePageModel } from '@/lib/pdf/measurePages';
import type { CopyType } from '@/lib/pdf/types';

const VALID_COPY_TYPES: CopyType[] = ['ORIGINAL', 'COPY_CUSTOMER', 'COPY_ACCOUNTING', 'COPY_WAREHOUSE', 'COPY_SALES'];

export default async function ReceiptPrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { copy?: string; token?: string; mode?: string; pageModel?: string };
}) {
  const copyType = (VALID_COPY_TYPES.includes(searchParams.copy as CopyType) ? searchParams.copy : 'ORIGINAL') as CopyType;

  let authorized = false;
  if (searchParams.token) {
    const payload = verifyPrintToken(searchParams.token);
    if (payload && payload.docType === 'receipt' && payload.id === params.id) authorized = true;
  }
  if (!authorized) {
    const session = await getServerSession(authOptions);
    if (session?.user && hasPermission(session.user, PERMISSIONS.INVOICE_PRINT)) authorized = true;
  }
  if (!authorized) notFound();

  const data = await buildReceiptPrintData(params.id, copyType);
  const mode: RenderMode = searchParams.mode === 'measure' ? 'measure' : searchParams.mode === 'paged' ? 'paged' : 'continuous';
  const pageModel = mode === 'paged' && searchParams.pageModel ? decodePageModel(searchParams.pageModel) : undefined;

  return <DocumentRenderer data={data} mode={mode} pageModel={pageModel} />;
}
