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
          .header-block { padding-bottom: 8px; }
          .header-flex { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${template.headerColor}; padding-bottom: 8px; margin-bottom: 8px; }
          .company-block { display: flex; gap: 10px; max-width: 60%; }
          .company-block img.logo { height: 56px; object-fit: contain; }
          .company-name-th { font-weight: 700; font-size: 1.15em; color: ${template.headerColor}; }
          .company-name-en { font-size: 0.9em; color: #555; }
          .company-meta { font-size: 0.85em; color: #444; line-height: 1.5; }
          .doc-meta { text-align: right; }
          .doc-title { font-size: 1.3em; font-weight: 700; color: ${template.headerColor}; }
          .copy-badge { display: inline-block; margin-top: 2px; padding: 1px 8px; border: 1px solid ${template.headerColor}; border-radius: 3px; font-size: 0.8em; color: ${template.headerColor}; }
          .doc-meta table { margin-left: auto; font-size: 0.85em; }
          .doc-meta td { padding: 1px 0 1px 8px; text-align: left; }
          .doc-meta td.k { color: #666; text-align: right; }
          .customer-block { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; margin-bottom: 8px; font-size: 0.88em; }
          .customer-block .title { font-weight: 700; color: ${template.headerColor}; margin-bottom: 2px; }
          th.col-head { background: ${template.headerColor}; color: #fff; font-size: 0.85em; padding: 5px 6px; text-align: left; white-space: nowrap; }
          th.col-head.num, td.num { text-align: right; }
          td { padding: 5px 6px; font-size: 0.9em; border-bottom: 1px solid #eee; vertical-align: top; }
          tr.heading-row td { background: #f3f4f6; font-weight: 700; color: ${template.headerColor}; }
          tr.text-row td { color: #444; font-style: italic; }
          .item-name { font-weight: 600; }
          .item-desc { color: #666; font-size: 0.92em; white-space: pre-line; }
          .item-img { display: block; margin-top: 3px; object-fit: contain; }
          .totals-block { page-break-inside: avoid; }
          .totals-table { width: 320px; margin-left: auto; font-size: 0.9em; }
          .totals-table td { padding: 3px 4px; border: none; }
          .totals-table tr.net td { border-top: 2px solid ${template.headerColor}; font-weight: 700; font-size: 1.1em; }
          .amount-words { text-align: right; font-size: 0.85em; color: #555; margin-top: 2px; }
          .terms-block { font-size: 0.85em; color: #444; margin-top: 10px; white-space: pre-line; }
          .signature-block { page-break-inside: avoid; margin-top: 30px; display: flex; justify-content: space-between; }
          .signature-col { width: 45%; text-align: center; font-size: 0.85em; }
          .signature-img { height: 50px; object-fit: contain; margin-bottom: 4px; }
          .signature-line { border-top: 1px solid #999; margin-top: 40px; padding-top: 4px; }
          .stamp-img { position: relative; height: 70px; opacity: 0.9; }
          .footer-text { text-align: center; font-size: 0.78em; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 6px; }
        `}</style>
      <div className="print-root">
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
            <tr>
              <td colSpan={colCount} style={{ borderBottom: 'none' }}>
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
                      <div className="doc-title">{data.docTitle}</div>
                      <div className="copy-badge">
                        {copyLabel.th} / {copyLabel.en}
                      </div>
                      <table>
                        <tbody>
                          <tr>
                            <td className="k">เลขที่เอกสาร</td>
                            <td>
                              {data.docNumber}
                              {data.revisionNo > 0 ? ` Rev.${data.revisionNo}` : ''}
                            </td>
                          </tr>
                          <tr>
                            <td className="k">วันที่</td>
                            <td>{data.quoteDate}</td>
                          </tr>
                          <tr>
                            <td className="k">ยืนราคาถึง</td>
                            <td>{data.validUntilDate}</td>
                          </tr>
                          {data.deliveryTerms && (
                            <tr>
                              <td className="k">ระยะเวลาส่งของ</td>
                              <td>{data.deliveryTerms}</td>
                            </tr>
                          )}
                          {data.paymentTerms && (
                            <tr>
                              <td className="k">เงื่อนไขชำระเงิน</td>
                              <td>{data.paymentTerms}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="customer-block">
                    <div className="title">ลูกค้า</div>
                    <div>
                      {customer.name} {customer.isHeadOffice ? '(สำนักงานใหญ่)' : customer.branchName ? `(สาขา ${customer.branchName})` : ''}
                    </div>
                    <div>{customer.address}</div>
                    <div>
                      โทร {customer.phone} {customer.email ? `· อีเมล ${customer.email}` : ''}{' '}
                      {customer.taxId ? `· เลขผู้เสียภาษี ${customer.taxId}` : ''}
                    </div>
                    {customer.contactName && <div>ผู้ติดต่อ: {customer.contactName}</div>}
                    {(data.projectName || data.title) && (
                      <div>
                        {data.projectName ? `โครงการ: ${data.projectName}` : ''} {data.title ? `— ${data.title}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
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
                  <table className="totals-table">
                    <tbody>
                      <tr>
                        <td>รวมเป็นเงิน</td>
                        <td className="num">{money(data.subtotal)}</td>
                      </tr>
                      {data.totalDiscount > 0 && (
                        <tr>
                          <td>ส่วนลด</td>
                          <td className="num">{money(data.totalDiscount)}</td>
                        </tr>
                      )}
                      <tr>
                        <td>มูลค่าหลังหักส่วนลด</td>
                        <td className="num">{money(data.amountAfterDiscount)}</td>
                      </tr>
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
                    </tbody>
                  </table>
                  <div className="amount-words">({data.amountInWordsTh})</div>

                  {(data.note || company.standardTerms) && (
                    <div className="terms-block">
                      {company.standardTerms && <div>{company.standardTerms}</div>}
                      {data.note && <div>หมายเหตุ: {data.note}</div>}
                      {company.bankAccounts.length > 0 && (
                        <div>
                          บัญชีธนาคาร:{' '}
                          {company.bankAccounts
                            .map((b) => `${b.bankName} ${b.accountName} เลขที่ ${b.accountNumber}`)
                            .join(' | ')}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="signature-block">
                    <div className="signature-col">
                      {company.stampDataUri && <img className="stamp-img" src={company.stampDataUri} alt="stamp" />}
                      <div className="signature-line">
                        ผู้อนุมัติสั่งซื้อ / ลูกค้า
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
