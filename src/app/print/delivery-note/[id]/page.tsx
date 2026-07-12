import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyPrintToken } from '@/lib/printToken';
import { hasPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { buildDeliveryNotePrintData } from '@/lib/pdf/buildDeliveryNotePrintData';
import { DeliveryNotePrintDocument } from '@/components/print/DeliveryNotePrintDocument';
import type { CopyType } from '@/lib/pdf/types';

const VALID_COPY_TYPES: CopyType[] = ['ORIGINAL', 'COPY_CUSTOMER', 'COPY_ACCOUNTING', 'COPY_WAREHOUSE', 'COPY_SALES'];

export default async function DeliveryNotePrintPage({
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
    if (payload && payload.docType === 'delivery-note' && payload.id === params.id) authorized = true;
  }
  if (!authorized) {
    const session = await getServerSession(authOptions);
    if (session?.user && hasPermission(session.user, PERMISSIONS.DELIVERY_NOTE_MANAGE)) authorized = true;
  }
  if (!authorized) notFound();

  const data = await buildDeliveryNotePrintData(params.id, copyType);
  return <DeliveryNotePrintDocument data={data} />;
}
