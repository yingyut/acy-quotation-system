import type { DocumentPrintData } from '@/lib/pdf/types';

export function DocumentMeta({ data }: { data: DocumentPrintData }) {
  return (
    <table className="doc-meta-table" data-role="document-meta">
      <tbody>
        <tr>
          <td className="k">{data.issueDateLabel}</td>
          <td>{data.issueDate}</td>
          <td className="k">เลขที่</td>
          <td>
            {data.docNumber}
            {data.revisionNo ? ` Rev.${data.revisionNo}` : ''}
          </td>
        </tr>
        {data.dueDate && (
          <tr>
            <td className="k">ครบกำหนด</td>
            <td colSpan={3}>{data.dueDate}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
