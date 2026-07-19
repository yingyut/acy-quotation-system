import type { DocumentPrintData } from '@/lib/pdf/types';

export function CompanyHeader({ data, variant }: { data: DocumentPrintData; variant: 'full' | 'compact' }) {
  const { company } = data;
  const { header } = data.config;

  if (variant === 'compact') {
    return (
      <div className="header-compact" data-role="header-compact">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {header.showLogo && company.logoDataUri && (
            <img
              className="logo"
              src={company.logoDataUri}
              alt=""
              style={{ width: `${header.logoWidthMm * 0.6}mm`, height: `${header.logoHeightMm * 0.6}mm` }}
            />
          )}
          <span className="header-name-th" style={{ fontSize: '0.95em' }}>
            {company.nameTh}
          </span>
        </div>
        <span>{data.docNumber}</span>
      </div>
    );
  }

  return (
    <div className="header-company" data-role="header-company">
      {header.showLogo && company.logoDataUri && (
        <img
          className="logo"
          src={company.logoDataUri}
          alt=""
          style={{ width: `${header.logoWidthMm}mm`, height: `${header.logoHeightMm}mm` }}
        />
      )}
      <div>
        <div className="header-name-th">{company.nameTh}</div>
        <div className="header-name-en">{company.nameEn}</div>
        {header.showAddress && company.addressTh && <div className="header-meta-line">{company.addressTh}</div>}
        {(header.showPhone || header.showEmail) && (
          <div className="header-meta-line header-contact-line">
            {header.showPhone && company.phone && <>Tel: {company.phone} </>}
            {header.showEmail && company.email && <>Email: {company.email}</>}
          </div>
        )}
        {header.showTaxId && (
          <div className="header-meta-line">เลขประจำตัวผู้เสียภาษีอากร (TAX ID.) {company.taxId}</div>
        )}
      </div>
    </div>
  );
}
