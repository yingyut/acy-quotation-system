import type { DocumentPrintData } from '@/lib/pdf/types';

export function PageFooter({ data }: { data: DocumentPrintData }) {
  if (!data.config.sections.showFooterText) return null;
  if (!data.company.footerText) return null;
  return (
    <div className="footer-text" data-role="page-footer">
      {data.company.footerText}
    </div>
  );
}
