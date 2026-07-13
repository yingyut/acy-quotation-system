import { buildDefaultTemplateConfig, type DocumentTemplateConfig } from '@/lib/pdf/templateConfig';
import type { DocumentPrintData, PrintLineItem } from '@/lib/pdf/types';

/**
 * Deterministic sample document data used by the Admin Template Editor's
 * live preview (and available for PDF-pipeline tests) - lets an admin see
 * a realistic multi-item document without needing to open a real record.
 * `itemCount` controls how many product rows are generated, letting the
 * preview/tests exercise 1-page, 2-page, and 5-page pagination on demand.
 */
export function buildSamplePrintData(config?: DocumentTemplateConfig, itemCount = 6): DocumentPrintData {
  const items: PrintLineItem[] = [];
  for (let i = 1; i <= itemCount; i++) {
    items.push({
      no: i,
      itemType: 'PRODUCT',
      code: `SKU-${String(i).padStart(3, '0')}`,
      name: `สินค้าตัวอย่างที่ ${i} - Sample Product ${i}`,
      description:
        i % 3 === 0
          ? 'สเปกตัวอย่าง: คุณสมบัติเด่น ประสิทธิภาพสูง ทนทาน รับประกัน 1 ปี พร้อมบริการหลังการขายเต็มรูปแบบตลอดอายุการใช้งาน'
          : null,
      imageDataUri: null,
      qty: 2,
      unit: 'ชิ้น',
      unitPrice: 1500 + i * 250,
      discountLabel: i % 4 === 0 ? '5%' : null,
      lineTotal: (1500 + i * 250) * 2,
      hideUnitPrice: false,
    });
  }

  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const vatAmount = Math.round(subtotal * 0.07 * 100) / 100;
  const netTotal = subtotal + vatAmount;

  return {
    docTypeKey: 'QUOTATION',
    docTitleTh: 'ใบเสนอราคา',
    docTitleEn: 'Quotation',
    docNumber: 'QT-2026-0001',
    revisionNo: 0,
    copyType: 'ORIGINAL',
    issueDateLabel: 'วันที่',
    issueDate: '12 กรกฎาคม 2569',
    dueDate: null,
    validUntilDate: '11 สิงหาคม 2569',
    deliveryTerms: '7-14 วันทำการหลังยืนยันคำสั่งซื้อ',
    paymentTerms: 'ชำระเงิน 50% เมื่อสั่งซื้อ ส่วนที่เหลือชำระเมื่องานแล้วเสร็จ',
    creditTermDays: 30,
    projectName: 'โครงการตัวอย่าง (Sample Project)',
    title: 'งานติดตั้งระบบตัวอย่างสำหรับดูตัวอย่าง Template',
    company: {
      nameTh: 'บริษัท เอซีวาย เทคโนโลยี จำกัด',
      nameEn: 'ACY Technology Co., Ltd.',
      taxId: '0-1055-51234-56-7',
      addressTh: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
      phone: '02-999-8888',
      email: 'sales@acy-example.co.th',
      logoDataUri: null,
      stampDataUri: null,
      authorizedSignatureDataUri: null,
      preparedSignatureDataUri: null,
      standardTerms: 'ราคานี้ยังไม่รวมภาษีมูลค่าเพิ่ม และอาจเปลี่ยนแปลงได้โดยไม่ต้องแจ้งให้ทราบล่วงหน้า',
      footerText: 'ขอบคุณที่ใช้บริการ ACY Technology',
      primaryColor: '#0F4C81',
      bankAccounts: [
        { bankName: 'ธนาคารกสิกรไทย', accountName: 'บจก. เอซีวาย เทคโนโลยี', accountNumber: '123-4-56789-0', branchName: 'สาขาสุขุมวิท' },
      ],
    },
    customer: {
      name: 'บริษัท ตัวอย่างลูกค้า จำกัด',
      address: '456 ถนนพระราม 4 แขวงคลองตัน เขตคลองเตย กรุงเทพมหานคร 10110',
      phone: '02-111-2222',
      email: 'purchase@customer-example.co.th',
      taxId: '0-1055-98765-43-2',
      isHeadOffice: true,
      branchName: null,
      branchCode: null,
      contactName: 'คุณสมชาย ใจดี',
    },
    items,
    subtotal,
    totalDiscount: 0,
    amountAfterDiscount: subtotal,
    vatEnabled: true,
    vatRate: 7,
    vatAmount,
    whtEnabled: false,
    whtRate: 0,
    whtAmount: 0,
    netTotal,
    amountInWordsTh: 'ตัวอย่างจำนวนเงินเป็นตัวอักษร',
    note: 'นี่คือหมายเหตุตัวอย่างสำหรับแสดงผลใน Template Preview',
    preparedByName: 'สมหญิง ขายเก่ง',
    approvedByName: null,
    paidAmount: null,
    balanceAmount: null,
    quotationDocNumber: null,
    salesOrderDocNumber: null,
    receivedByName: null,
    paymentInfo: null,
    config: config ?? buildDefaultTemplateConfig(),
  };
}
