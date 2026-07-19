import type { DocumentPrintData } from '@/lib/pdf/types';

export function DocumentMeta({ data }: { data: DocumentPrintData }) {
  return (
    <table className="doc-meta-stack" data-role="document-meta">
      <thead>
        <tr>
          <th>{data.issueDateLabel} (Date)</th>
          <th>เลขที่{data.docTitleTh}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{data.issueDate}</td>
          <td>
            {data.docNumber}
            {data.revisionNo ? ` Rev.${data.revisionNo}` : ''}
          </td>
        </tr>
        {data.dueDate && (
          <tr>
            <td colSpan={2}>ครบกำหนด {data.dueDate}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
