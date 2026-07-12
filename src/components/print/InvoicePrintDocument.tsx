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
          .totals-table { width: 320px; margin-left: auto; font-size: 0.9em; border: 1px solid #999; border-collapse: collapse; }
          .totals-table td { padding: 3px 8px; border: 1px solid #ccc; }
          .totals-table tr.net td { font-weight: 700; font-size: 1.05em; background: #f2f2f2; }
          .amount-words { text-align: right; font-size: 0.85em; color: #555; margin-top: 2px; }
          .payment-block { margin-top: 10px; font-size: 0.88em; background: #f3f4f6; padding: 8px 10px; border-radius: 4px; }
          .signature-block { page-break-inside: avoid; margin-top: 30px; display: flex; justify-content: space-between; }
          .signature-col { width: 45%; text-align: center; font-size: 0.85em; }
          .signature-img { height: 50px; object-fit: contain; margin-bottom: 4px; }
          .signature-line { border-top: 1px solid #999; margin-top: 40px; padding-top: 4px; }
          .stamp-img { height: 70px; opacity: 0.9; }
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
                      <tr className="net">
                        <td>ยอดสุทธิ</td>
                        <td className="num">{money(data.netTotal)}</td>
                      </tr>
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
                    </tbody>
                  </table>
                  <div className="amount-words">({data.amountInWordsTh})</div>

                  {data.paymentInfo && (
                    <div className="payment-block">
                      ได้รับชำระเงินแล้วเมื่อวันที่ {data.paymentInfo.paidDate} วิธีชำระ: {data.paymentInfo.method}
                      {data.paymentInfo.refNumber ? ` เลขอ้างอิง: ${data.paymentInfo.refNumber}` : ''}
                    </div>
                  )}

                  {company.bankAccounts.length > 0 && (
                    <div style={{ fontSize: '0.85em', color: '#444', marginTop: 8 }}>
                      บัญชีธนาคาร:{' '}
                      {company.bankAccounts.map((b) => `${b.bankName} ${b.accountName} เลขที่ ${b.accountNumber}`).join(' | ')}
                    </div>
                  )}

                  <div className="signature-block">
                    <div className="signature-col">
                      {company.stampDataUri && <img className="stamp-img" src={company.stampDataUri} alt="stamp" />}
                      <div className="signature-line">ผู้รับเงิน / ผู้มีอำนาจลงนาม</div>
                    </div>
                    <div className="signature-col">
                      {company.preparedSignatureDataUri && (
                        <img className="signature-img" src={company.preparedSignatureDataUri} alt="signature" />
                      )}
                      <div className="signature-line">
                        ผู้จัดทำ: {data.preparedByName}
                        <br />
                        วันที่ {data.issueDate}
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
