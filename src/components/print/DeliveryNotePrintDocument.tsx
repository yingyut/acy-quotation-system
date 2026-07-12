import type { DeliveryNotePrintData } from '@/lib/pdf/types';

export function DeliveryNotePrintDocument({ data }: { data: DeliveryNotePrintData }) {
  const { customer, template } = data;
  const colCount = 1 + (template.showProductCode ? 1 : 0) + 1 + 1 + 1;

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
          .doc-meta-table { font-size: 0.82em; border: 1px solid #999; border-collapse: collapse; width: 100%; margin-bottom: 8px; }
          .doc-meta-table td { padding: 3px 8px; text-align: left; border: 1px solid #ccc; }
          .doc-meta-table td.k { color: #333; text-align: right; background: #f7f7f7; white-space: nowrap; }
          .customer-block { border: 1px solid #999; border-radius: 2px; padding: 6px 10px; margin-bottom: 8px; font-size: 0.88em; }
          .customer-block .title { font-weight: 700; color: #1a1a1a; margin-bottom: 2px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
          th.col-head { background: #f2f2f2; color: #1a1a1a; font-size: 0.85em; font-weight: 700; padding: 5px 6px; text-align: left; white-space: nowrap; border: 1px solid #999; }
          th.col-head.num, td.num { text-align: right; }
          th.col-head.center, td.center { text-align: center; }
          td { padding: 5px 6px; font-size: 0.9em; border-bottom: 1px solid #eee; vertical-align: top; }
          .item-name { font-weight: 600; }
          .item-desc { color: #666; font-size: 0.92em; }
          .notes-block { page-break-inside: avoid; margin-top: 10px; font-size: 0.85em; color: #444; }
          .signature-block { page-break-inside: avoid; margin-top: 30px; display: flex; justify-content: space-between; }
          .signature-col { width: 45%; text-align: center; font-size: 0.85em; border: 1px solid #999; border-radius: 2px; padding: 8px 10px 12px; }
          .signature-title { font-weight: 700; margin-bottom: 30px; }
          .signature-line { border-top: 1px solid #999; margin-top: 4px; padding-top: 4px; }
          .signature-date { color: #555; font-size: 0.92em; margin-top: 2px; }
          .footer-text { text-align: center; font-size: 0.78em; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 6px; }
        `}</style>
      <div className="print-root">
        <div className="header-block">
          <table className="doc-meta-table">
            <tbody>
              <tr>
                <td className="k">วันที่ส่งของ</td>
                <td>{data.deliveryDate}</td>
                <td className="k">อ้างอิงใบสั่งขาย</td>
                <td>{data.salesOrderDocNumber}</td>
                <td className="k">อ้างอิงใบเสนอราคา</td>
                <td>{data.quotationDocNumber || '-'}</td>
              </tr>
            </tbody>
          </table>

          <div className="customer-block">
            <div className="title">ส่งให้ลูกค้า</div>
            <div>
              {customer.name} {customer.isHeadOffice ? '(สำนักงานใหญ่)' : customer.branchName ? `(สาขา ${customer.branchName})` : ''}
            </div>
            <div>{customer.address}</div>
            <div>โทร {customer.phone}</div>
          </div>
        </div>

        <table className="doc">
          <thead>
            <tr>
              <th className="col-head num" style={{ width: 28 }}>ลำดับ</th>
              {template.showProductCode && <th className="col-head">รหัสสินค้า</th>}
              <th className="col-head">รายละเอียดสินค้า/บริการ</th>
              <th className="col-head num" style={{ width: 70 }}>จำนวน</th>
              <th className="col-head" style={{ width: 60 }}>หน่วย</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.no}>
                <td className="num">{item.no}</td>
                {template.showProductCode && <td>{item.code}</td>}
                <td>
                  <div className="item-name">{item.name}</div>
                  {item.description && <div className="item-desc">{item.description}</div>}
                </td>
                <td className="num">{item.qty}</td>
                <td>{item.unit}</td>
              </tr>
            ))}

            <tr>
              <td colSpan={colCount} style={{ borderBottom: 'none', paddingTop: 14 }}>
                {data.note && (
                  <div className="notes-block">
                    <strong>หมายเหตุ:</strong> {data.note}
                  </div>
                )}

                <div className="signature-block">
                  <div className="signature-col">
                    <div className="signature-title">ผู้ส่งสินค้า</div>
                    <div className="signature-line">{data.preparedByName}</div>
                    <div className="signature-date">วันที่ {data.deliveryDate}</div>
                  </div>
                  <div className="signature-col">
                    <div className="signature-title">ผู้รับสินค้า</div>
                    <div className="signature-line">{data.receivedByName || ''}</div>
                    <div className="signature-date">วันที่ ....../....../......</div>
                  </div>
                </div>

                {data.company.footerText && <div className="footer-text">{data.company.footerText}</div>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
