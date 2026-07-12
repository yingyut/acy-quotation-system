import type { DocumentPrintData } from '@/lib/pdf/types';

export function CustomerSection({ data }: { data: DocumentPrintData }) {
  const c = data.customer;
  const cfg = data.config.customer;
  return (
    <div className="customer-block" data-role="customer-section">
      <div className="cust-row">
        <div className="cust-label">นามลูกค้า</div>
        <div className="cust-value">{c.name}</div>
      </div>
      <div className="cust-row">
        <div className="cust-label">ที่อยู่</div>
        <div className="cust-value">{c.address}</div>
      </div>
      {(cfg.showPhone || cfg.showEmail) && (
        <div className="cust-row">
          {cfg.showPhone && (
            <div className="cust-value" style={{ flex: '0 1 auto', whiteSpace: 'nowrap', marginRight: 16 }}>
              โทรศัพท์ {c.phone || '-'}
            </div>
          )}
          {cfg.showEmail && (
            <>
              <div className="cust-label" style={{ width: 'auto', marginRight: 6 }}>
                E-Mail:
              </div>
              <div className="cust-value">{c.email || '-'}</div>
            </>
          )}
        </div>
      )}
      {cfg.showTaxId && (
        <div className="cust-row">
          <div className="cust-label">เลขประจำตัวผู้เสียภาษี</div>
          <div className="cust-value">
            {c.taxId || '-'}
            {cfg.showBranch && (
              <>
                <span className="cust-check">{c.isHeadOffice ? '☑' : '☐'} สำนักงานใหญ่</span>
                <span className="cust-check">
                  {!c.isHeadOffice ? '☑' : '☐'} สาขา {c.branchCode || ''}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      {cfg.showContact && c.contactName && (
        <div className="cust-row">
          <div className="cust-label">ผู้ติดต่อ</div>
          <div className="cust-value">{c.contactName}</div>
        </div>
      )}
    </div>
  );
}
