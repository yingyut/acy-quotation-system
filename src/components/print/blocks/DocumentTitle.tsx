import type { DocumentPrintData } from '@/lib/pdf/types';
import { COPY_LABELS } from '@/lib/pdf/types';

export function DocumentTitle({ data }: { data: DocumentPrintData }) {
  const copyLabel = COPY_LABELS[data.copyType];
  return (
    <div className="header-doc" data-role="document-title">
      <div className="header-title-th">{data.docTitleTh}</div>
      <div className="header-title-en">{data.docTitleEn}</div>
      <div className="header-badge">
        {copyLabel.th} / {copyLabel.en}
      </div>
    </div>
  );
}
