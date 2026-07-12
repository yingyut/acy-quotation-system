import type { InvoicePrintData } from '@/lib/pdf/types';

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoicePrintDocument({ data }: { data: InvoicePrintData }) {
  const { company, customer, template } = data;
  const colCount = 1 + (template.showProductCode ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1;

  return (
    <>
      <style>{`
          @import url('/fonts/sarabun.css');
          html, body { background: #fff !important; margin: 0; padding: 0; }
          * { box-sizing: border-box; }
          .print-root { font-family: 'Sarabun', sans-serif; font-size: ${template.fontSizeBase}pt; color: #1a1a1a; }
          table.doc { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          .header-block { padding-bottom: 6px; }
          .doc-meta-table { font-size: 0.82em; border: 1px solid #999; border-collapse: collapse; }
          .doc-meta-table td { padding: 3px 8px; text-align: left; border: 1px solid #ccc; }
          .doc-meta-table td.k { color: #333; text-align: right; background: #f7f7f7; white-space: nowrap; }
          .doc-meta-table-full { width: 100%; margin-bottom: 8px; }
          .customer-block { border: 1px solid #999; border-radius: 2px; padding: 6px 10px; margin-bottom: 8px; font-size: 0.88em; }
          .customer-block .title { font-weight: 700; color: #1a1a1a; margin-bottom: 2px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
          th.col-head { background: #f2f2f2; color: #1a1a1a; font-size: 0.85em; font-weight: 700; padding: 5px 6px; text-align: left; white-space: nowrap; border: 1px solid #999; }
          th.col-head.num, td.num { text-align: right; }
          td { padding: 5px 6px; font-size: 0.9em; border-bottom: 1px solid #eee; vertical-align: top; }
          .item-name { font-weight: 600; }
          .item-desc { color: #666; font-size: 0.92em; }
          .totals-block { page-break-inside: avoid; }
          .totals-wrap { display: flex; align-items: flex-start; gap: 12px; margin-top: 10px; }
          .left-col { flex: 1; min-width: 0; }
          .amount-words-band { background: #f2f2f2; padding: 5px 10px; font-size: 0.88em; margin-bottom: 8px; }
          .amount-words-band .label { font-weight: 700; margin-right: 10px; }
          .totals-table { width: 300px; flex-shrink: 0; font-size: 0.9em; border: 1px solid #999; border-collapse: collapse; }
          .totals-table td { padding: 4px 8px; border: 1px solid #ccc; }
          .totals-table tr.grand-total td { font-weight: 700; font-size: 1.05em; }
          .terms-block { font-size: 0.85em; color: #444; white-space: pre-line; }
          .terms-title { font-weight: 700; margin-bottom: 2px; }
          .signature-block { page-break-inside: avoid; margin-top: 30px; display: flex; justify-content: space-between; }
          .signature-col { width: 45%; text-align: center; font-size: 0.85em; border: 1px solid #999; border-radius: 2px; padding: 8px 10px 12px; }
          .signature-col-left { display: flex; flex-direction: column; justify-content: flex-end; }
          .signature-title { font-weight: 700; margin-bottom: 30px; }
          .signature-img { height: 45px; object-fit: contain; margin-bottom: 2px; }
          .signature-img-placeholder { height: 45px; }
          .signature-line { border-top: 1px solid #999; margin-top: 4px; padding-top: 4px; }
          .signature-date { color: #555; font-size: 0.92em; margin-top: 2px; }
          .stamp-img { height: 55px; opacity: 0.9; margin-top: -20px; }
          .footer-text { text-align: center; font-size: 0.78em; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 6px; }
        `}</style>
      <div className="print-root">
        {/* The repeating page header (logo, company name, doc title/number,
            customer name) already covers page 1 too - see
            headerTemplate.ts / buildInvoiceRepeatingHeaderHtml. This block
            (outside the <table>, so it appears once on page 1 only) just
            carries the extra detail that header is too compact for: due
            date, the originating quotation number, and full customer info. */}
        <div className="header-block">
          <table className="doc-meta-table doc-meta-table-full">
            <tbody>
              {(data.dueDate || data.quotationDocNumber) && (
                <tr>
                  {data.dueDate && (
                    <>
                      <td className="k">ครบกำหนดชำระ</td>
                      <td>{data.dueDate}</td>
                    </>
                  )}
                  {data.quotationDocNumber && (
                    <>
                      <td className="k">อ้างอิงใบเสนอราคา</td>
                      <td>{data.quotationDocNumber}</td>
                    </>
                  )}
                </tr>
              )}
            </tbody>
          </table>

          <div className="customer-block">
            <div className="title">ลูกค้า</div>
            <div>
              {customer.name} {customer.isHeadOffice ? '(สำนักงานใหญ่)' : customer.branchName ? `(สาขา ${customer.branchName})` : ''}
            </div>
            <div>{customer.address}</div>
            <div>
              โทร {customer.phone} {customer.taxId ? `· เลขผู้เสียภาษี ${customer.taxId}` : ''}
            </div>
          </div>
        </div>

        <table className="doc">
          <thead>
            <tr>
              <th className="col-head num" style={{ width: 28 }}>ลำดับ</th>
              {template.showProductCode && <th className="col-head">รหัสสินค้า</th>}
              <th className="col-head">รายละเอียดสินค้า/บริการ</th>
              <th className="col-head num" style={{ width: 50 }}>จำนวน</th>
              <th className="col-head" style={{ width: 45 }}>หน่วย</th>
              <th className="col-head num" style={{ width: 70 }}>ราคา/หน่วย</th>
              <th className="col-head num" style={{ width: 60 }}>ส่วนลด</th>
              <th className="col-head num" style={{ width: 85 }}>รวมเงิน</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx}>
                <td className="num">{item.no}</td>
                {template.showProductCode && <td>{item.code}</td>}
                <td>
                  <div className="item-name">{item.name}</div>
                  {item.description && <div className="item-desc">{item.description}</div>}
                </td>
                <td className="num">{item.qty}</td>
                <td>{item.unit}</td>
                <td className="num">{money(item.unitPrice)}</td>
                <td className="num">{item.discountLabel ?? '-'}</td>
                <td className="num">{money(item.lineTotal)}</td>
              </tr>
            ))}

            <tr>
              <td colSpan={colCount} style={{ borderBottom: 'none', paddingTop: 14 }}>
                <div className="totals-block">
                  <div className="totals-wrap">
                    <div className="left-col">
                      <div className="amount-words-band">
                        <span className="label">จำนวนเงิน (ตัวอักษร)</span>
                        <span className="value">{data.amountInWordsTh}</span>
                      </div>

                      {(() => {
                        const noteLines: string[] = [];
                        if (data.paymentInfo) {
                          noteLines.push(
                            `ได้รับชำระเงินแล้วเมื่อวันที่ ${data.paymentInfo.paidDate} วิธีชำระ: ${data.paymentInfo.method}` +
                              (data.paymentInfo.refNumber ? ` เลขอ้างอิง: ${data.paymentInfo.refNumber}` : ''),
                          );
                        }
                        if (company.bankAccounts.length > 0) {
                          noteLines.push(
                            'กรณีชำระเงิน โอนผ่านบัญชีธนาคาร ' +
                              company.bankAccounts
                                .map((b) => `${b.bankName} เลขที่บัญชี ${b.accountNumber} ชื่อบัญชี ${b.accountName}`)
                                .join(' หรือ '),
                          );
                        }
                        if (noteLines.length === 0) return null;
                        return (
                          <div className="terms-block">
                            <div className="terms-title">หมายเหตุ :</div>
                            {noteLines.map((line, i) => (
                              <div key={i}>
                                {i + 1}. {line}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    <table className="totals-table">
                      <tbody>
                        <tr>
                          <td>รวมเงิน</td>
                          <td className="num">{money(data.subtotal)}</td>
                        </tr>
                        {data.totalDiscount > 0 && (
                          <tr>
                            <td>ส่วนลด</td>
                            <td className="num">{money(data.totalDiscount)}</td>
                          </tr>
                        )}
                        <tr>
                          <td>มูลค่าคงเหลือ</td>
                          <td className="num">{money(data.amountAfterDiscount)}</td>
                        </tr>
                        <tr>
                          <td>ภาษีมูลค่าเพิ่ม {data.vatRate}%</td>
                          <td className="num">{money(data.vatAmount)}</td>
                        </tr>
                        {data.whtAmount > 0 && (
                          <tr>
                            <td>หัก ณ ที่จ่าย {data.whtRate}%</td>
                            <td className="num">-{money(data.whtAmount)}</td>
                          </tr>
                        )}
                        {data.paidAmount > 0 && (
                          <>
                            <tr>
                              <td>ชำระแล้ว</td>
                              <td className="num">{money(data.paidAmount)}</td>
                            </tr>
                            <tr>
                              <td>คงเหลือ</td>
                              <td className="num">{money(data.balanceAmount)}</td>
                            </tr>
                          </>
                        )}
                        <tr className="grand-total">
                          <td>
                            ยอดเงินสุทธิ
                            <br />
                            GRAND TOTAL
                          </td>
                          <td className="num">{money(data.netTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="signature-block">
                    <div className="signature-col signature-col-left">
                      <div className="signature-title">ผู้รับเงิน / ผู้มีอำนาจลงนาม</div>
                      <div className="signature-line">ลงชื่อ</div>
                      <div className="signature-date">วันที่ ....../....../......</div>
                    </div>
                    <div className="signature-col">
                      <div className="signature-title">ขอแสดงความนับถือ</div>
                      {company.preparedSignatureDataUri ? (
                        <img className="signature-img" src={company.preparedSignatureDataUri} alt="signature" />
                      ) : (
                        <div className="signature-img-placeholder" />
                      )}
                      {company.stampDataUri && <img className="stamp-img" src={company.stampDataUri} alt="stamp" />}
                      <div className="signature-line">{data.preparedByName}</div>
                      <div className="signature-date">ผู้จัดทำ · วันที่ {data.issueDate}</div>
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
