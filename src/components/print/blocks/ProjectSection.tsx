import type { DocumentPrintData } from '@/lib/pdf/types';

export function ProjectSection({ data }: { data: DocumentPrintData }) {
  if (!data.config.sections.showProjectSection) return null;
  if (!data.title && !data.projectName) return null;
  return (
    <div className="subject-block" data-role="project-section">
      <div className="cust-row">
        <div className="cust-label">รายการอุปกรณ์</div>
      </div>
      <div>{data.title || '-'}</div>
      {data.projectName && <div>โครงการ: {data.projectName}</div>}
    </div>
  );
}
