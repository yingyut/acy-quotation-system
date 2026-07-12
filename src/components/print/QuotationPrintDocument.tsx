import type { QuotationPrintData } from '@/lib/pdf/types';
import { COPY_LABELS } from '@/lib/pdf/types';

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const IMAGE_SIZE_PX: Record<string, number> = { NONE: 0, SMALL: 36, MEDIUM: 64, FULL: 120 };

export function QuotationPrintDocument({ data }: { data: QuotationPrintData }) {
  const { company, customer, template } = data;
  const copyLabel = COPY_LABELS[data.copyType];
  const imgSize = IMAGE_SIZE_PX[template.productImageMode] ?? 0;

  const colCount =
    1 + // no
    (template.showProductCode ? 1 : 0) +
    1 + // description
    1 + // qty
    1 + // unit
    (template.showUnitPrice ? 1 : 0) +
    (template.showDiscountColumn ? 1 : 0) +
    1; // line total

  return (
    <>
      <style>{`
          @import url('/fonts/sarabun.css');
          html, body { background: #fff !important; margin: 0; padding: 0; }
          * { box-sizing: border-box; }
          .print-root {
            font-family: 'Sarabun', sans-serif;
            font-size: ${template.fontSizeBase}pt;
            color: #1a1a1a;
          }
          table.doc { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
          .header-block { padding-bottom: 6px; }
          .header-flex { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #999; }
          .company-block { display: flex; gap: 10px; max-width: 58%; }
          .company-block img.logo { height: 60px; width: 60px; object-fit: contain; }
          .company-name-th { font-weight: 700; font-size: 1.1em; color: #1a1a1a; }
          .company-name-en { font-size: 0.9em; color: #333; }
          .company-meta { font-size: 0.85em; color: #333; line-height: 1.5; margin-top: 2px; }
          .doc-meta { text-align: right; }
          .doc-title { font-size: 1.25em; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
          .copy-badge { display: inline-block; margin-bottom: 4px; padding: 1px 8px; border: 1px solid ${template.headerColor}; border-radius: 3px; font-size: 0.8em; color: ${template.headerColor}; }
          .doc-meta-table { margin-left: auto; font-size: 0.82em; border: 1px solid #999; border-collapse: collapse; }
          .doc-meta-table td { padding: 3px 8px; text-align: left; border: 1px solid #ccc; }
          .doc-meta-table td.k { color: #333; text-align: right; background: #f7f7f7; white-space: nowrap; }
          .info-row { display: flex; gap: 8px; margin-bottom: 8px; }
          .customer-block { flex: 1.4; border: 1px solid #999; border-radius: 2px; padding: 6px 10px; font-size: 0.88em; }
          .subject-block { flex: 1; border: 1px solid #999; border-radius: 2px; padding: 6px 10px; font-size: 0.88em; }
          .block-title { font-weight: 700; color: #1a1a1a; margin-bottom: 2px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
          th.col-head { background: #f2f2f2; color: #1a1a1a; font-size: 0.85em; font-weight: 700; padding: 5px 6px; text-align: left; white-space: nowrap; border: 1px solid #999; }
          th.col-head.num, td.num { text-align: right; }
          td { padding: 5px 6px; font-size: 0.9em; border-bottom: 1px solid #eee; vertical-align: top; }
          tr.heading-row td { background: #f3f4f6; font-weight: 700; color: #1a1a1a; text-decoration: underline; }
          tr.text-row td { color: #444; font-style: italic; }
          .item-name { font-weight: 600; }
          .item-desc { color: #666; font-size: 0.92em; white-space: pre-line; }
          .item-img { display: block; margin-top: 3px; object-fit: contain; }
          .totals-block { page-break-inside: avoid; }
          .totals-wrap { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
          .amount-words-box { flex: 1; border: 1px solid #999; border-radius: 2px; padding: 6px 10px; font-size: 0.85em; align-self: stretch; }
          .amount-words-box .label { color: #555; font-size: 0.85em; margin-bottom: 2px; }
          .amount-words-box .value { font-weight: 700; text-decoration: underline; }
          .totals-table { width: 300px; font-size: 0.9em; border: 1px solid #999; border-collapse: collapse; }
          .totals-table td { padding: 3px 8px; border: 1px solid #ccc; }
          .totals-table tr.net td { font-weight: 700; }
          .totals-table tr.grand-total td { font-weight: 700; font-size: 1.05em; background: #f2f2f2; text-transform: uppercase; }
          .terms-block { font-size: 0.85em; color: #444; margin-top: 10px; white-space: pre-line; }
          .signature-block { page-break-inside: avoid; margin-top: 30px; display: flex; justify-content: space-between; }
          .signature-col { width: 45%; text-align: center; font-size: 0.85em; }
          .signature-img { height: 50px; object-fit: contain; margin-bottom: 4px; }
          .signature-line { border-top: 1px solid #999; margin-top: 40px; padding-top: 4px; }
          .stamp-img { position: relative; height: 70px; opacity: 0.9; }
          .footer-text { text-align: center; font-size: 0.78em; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 6px; }
        `}</style>
      <div className="print-root">
        {/* Letterhead lives outside the <table> entirely, so it naturally
            appears once at the top of page 1 only. The <thead> below (just
            the column header row) still repeats automatically on every
            subsequent page via `display: table-header-group`. */}
        <div className="header-block">
          <div className="header-flex">
            <div className="company-block">
              {company.logoDataUri && <img className="logo" src={company.logoDataUri} alt="logo" />}
              <div>
                <div className="company-name-th">{company.nameTh}</div>
                <div className="company-name-en">{company.nameEn}</div>
                <div className="company-meta">
                  {company.addressTh}
                  <br />
                  โทร {company.phone} {company.email ? `· อีเมล ${company.email}` : ''}
                  <br />
                  เลขประจำตัวผู้เสียภาษี {company.taxId}
                </div>
              </div>
            </div>
            <div className="doc-meta">
              <div className="doc-title">{data.docTitle} / Quotation</div>
              <div className="copy-badge">
                {copyLabel.th} / {copyLabel.en}
              </div>
              <table className="doc-meta-table">
                <tbody>
                  <tr>
                    <td className="k">วันที่ (Date)</td>
                    <td>{data.quoteDate}</td>
                    <td className="k">เลขที่ใบเสนอราคา</td>
                    <td>
                      {data.docNumber}
                      {data.revisionNo > 0 ? ` Rev.${data.revisionNo}` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="k">กำหนดยืนราคา</td>
                    <td>{data.validUntilDate}</td>
                    <td className="k">ระยะเวลาส่งของ</td>
                    <td>{data.deliveryTerms || '-'}</td>
                  </tr>
                  <tr>
                    <td className="k">เงื่อนไขการชำระเงิน</td>
                    <td colSpan={3}>{data.paymentTerms || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="info-row">
            <div className="customer-block">
              <div className="block-title">นามลูกค้า / Customer</div>
              <div>
                {customer.name} {customer.isHeadOffice ? '(สำนักงานใหญ่)' : customer.branchName ? `(สาขา ${customer.branchName})` : ''}
              </div>
              <div>ที่อยู่: {customer.address}</div>
              <div>
                โทรศัพท์: {customer.phone} {customer.email ? `· E-Mail: ${customer.email}` : ''}
              </div>
              <div>
                เลขประจำตัวผู้เสียภาษี: {customer.taxId || '-'}
                {customer.branchCode ? ` · สาขา ${customer.branchCode}` : ' · สำนักงานใหญ่'}
              </div>
              {customer.contactName && <div>ผู้ติดต่อ: {customer.contactName}</div>}
            </div>
            <div className="subject-block">
              <div className="block-title">รายการอุปกรณ์ / Subject</div>
              <div>{data.title || '-'}</div>
              {data.projectName && <div>โครงการ: {data.projectName}</div>}
            </div>
          </div>
        </div>

        <table className="doc">
          <thead>
            <tr>
              <th className="col-head num" style={{ width: 28 }}>
                ลำดับ
              </th>
              {template.showProductCode && <th className="col-head">รหัสสินค้า</th>}
              <th className="col-head">รายละเอียดสินค้า/บริการ</th>
              <th className="col-head num" style={{ width: 50 }}>
                จำนวน
              </th>
              <th className="col-head" style={{ width: 45 }}>
                หน่วย
              </th>
              {template.showUnitPrice && (
                <th className="col-head num" style={{ width: 70 }}>
                  ราคา/หน่วย
                </th>
              )}
              {template.showDiscountColumn && (
                <th className="col-head num" style={{ width: 60 }}>
                  ส่วนลด
                </th>
              )}
              <th className="col-head num" style={{ width: 85 }}>
                รวมเงิน
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => {
              if (item.itemType === 'HEADING') {
                return (
                  <tr key={idx} className="heading-row">
                    <td colSpan={colCount}>{item.name}</td>
                  </tr>
                );
              }
              if (item.itemType === 'TEXT') {
                return (
                  <tr key={idx} className="text-row">
                    <td></td>
                    <td colSpan={colCount - 1}>{item.name}</td>
                  </tr>
                );
              }
              return (
                <tr key={idx}>
                  <td className="num">{item.no}</td>
                  {template.showProductCode && <td>{item.code}</td>}
                  <td>
                    <div className="item-name">{item.name}</div>
                    {item.description && <div className="item-desc">{item.description}</div>}
                    {item.imageDataUri && imgSize > 0 && (
                      <img
                        className="item-img"
                        src={item.imageDataUri}
                        alt=""
                        style={{ width: imgSize, height: imgSize }}
                      />
                    )}
                  </td>
                  <td className="num">{item.qty}</td>
                  <td>{item.unit}</td>
                  {template.showUnitPrice && (
                    <td className="num">{item.hideUnitPrice ? '-' : money(item.unitPrice)}</td>
                  )}
                  {template.showDiscountColumn && <td className="num">{item.discountLabel ?? '-'}</td>}
                  <td className="num">{money(item.lineTotal)}</td>
                </tr>
              );
            })}

            <tr>
              <td colSpan={colCount} style={{ borderBottom: 'none', paddingTop: 14 }}>
                <div className="totals-block">
                  <div className="totals-wrap">
                    <div className="amount-words-box">
                      <div className="label">จำนวนเงิน (ตัวอักษร)</div>
                      <div className="value">{data.amountInWordsTh}</div>
                    </div>
                    <table className="totals-table">
                      <tbody>
                        <tr>
                          <td>รวมเงิน</td>
                          <td className="num">{money(data.subtotal)}</td>
                        </tr>
                        {data.totalDiscount > 0 && (
                          <>
                            <tr>
                              <td>มูลค่าลดหย่อน</td>
                              <td className="num">{money(data.totalDiscount)}</td>
                            </tr>
                            <tr>
                              <td>ยอดคงเหลือ</td>
                              <td className="num">{money(data.amountAfterDiscount)}</td>
                            </tr>
                          </>
                        )}
                        {data.vatEnabled && (
                          <tr>
                            <td>ภาษีมูลค่าเพิ่ม {data.vatRate}%</td>
                            <td className="num">{money(data.vatAmount)}</td>
                          </tr>
                        )}
                        {data.whtEnabled && (
                          <tr>
                            <td>หัก ณ ที่จ่าย {data.whtRate}%</td>
                            <td className="num">-{money(data.whtAmount)}</td>
                          </tr>
                        )}
                        <tr className="net">
                          <td>ยอดสุทธิ</td>
                          <td className="num">{money(data.netTotal)}</td>
                        </tr>
                        <tr className="grand-total">
                          <td>Grand Total</td>
                          <td className="num">{money(data.netTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {(() => {
                    const noteLines: string[] = [];
                    if (company.bankAccounts.length > 0) {
                      noteLines.push(
                        'กรณีชำระเงิน โอนผ่านบัญชีธนาคาร ' +
                          company.bankAccounts
                            .map((b) => `${b.bankName} เลขที่บัญชี ${b.accountNumber} ชื่อบัญชี ${b.accountName}`)
                            .join(' หรือ '),
                      );
                    }
                    if (data.paymentTerms) noteLines.push(`เงื่อนไขการชำระเงิน: ${data.paymentTerms}`);
                    if (company.standardTerms) noteLines.push(company.standardTerms);
                    if (data.note) noteLines.push(`หมายเหตุ: ${data.note}`);
                    if (noteLines.length === 0) return null;
                    return (
                      <div className="terms-block">
                        {noteLines.map((line, i) => (
                          <div key={i}>
                            {i + 1}. {line}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="signature-block">
                    <div className="signature-col">
                      {company.stampDataUri && <img className="stamp-img" src={company.stampDataUri} alt="stamp" />}
                      <div className="signature-line">
                        ผู้อนุมัติสั่งซื้อ / ผู้มีอำนาจกระทำการแทนบริษัท
                        <br />
                        วันที่ ....../....../......
                      </div>
                    </div>
                    <div className="signature-col">
                      {company.preparedSignatureDataUri && (
                        <img className="signature-img" src={company.preparedSignatureDataUri} alt="signature" />
                      )}
                      <div className="signature-line">
                        ผู้จัดทำใบเสนอราคา: {data.preparedByName}
                        <br />
                        วันที่ {data.quoteDate}
                      </div>
                    </div>
                  </div>

                  {company.footerText && <div className="footer-text">{company.footerText}</div>}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
