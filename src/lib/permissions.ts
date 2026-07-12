// Central list of permission keys used across the system, and the
// default permission set granted to each built-in role. These defaults
// are written into the `permissions` / `role_permissions` tables by the
// seed script — Admins can then fine-tune them from Admin > Users > Roles
// without touching code (spec section 7).

export const PERMISSIONS = {
  CUSTOMER_VIEW: 'customer.view',
  CUSTOMER_MANAGE: 'customer.manage',
  CUSTOMER_IMPORT_EXPORT: 'customer.import_export',

  PRODUCT_VIEW: 'product.view',
  PRODUCT_MANAGE: 'product.manage',
  PRODUCT_VIEW_COST: 'product.view_cost',
  PRODUCT_IMPORT_EXPORT: 'product.import_export',

  QUOTATION_VIEW_OWN: 'quotation.view_own',
  QUOTATION_VIEW_ALL: 'quotation.view_all',
  QUOTATION_CREATE: 'quotation.create',
  QUOTATION_EDIT_OWN: 'quotation.edit_own',
  QUOTATION_EDIT_ALL: 'quotation.edit_all',
  QUOTATION_DELETE: 'quotation.delete',
  QUOTATION_VIEW_COST: 'quotation.view_cost',
  QUOTATION_APPROVE: 'quotation.approve',
  QUOTATION_EXPORT_PDF: 'quotation.export_pdf',
  QUOTATION_CANCEL: 'quotation.cancel',

  SALES_ORDER_MANAGE: 'sales_order.manage',
  DELIVERY_NOTE_MANAGE: 'delivery_note.manage',

  INVOICE_VIEW: 'invoice.view',
  INVOICE_MANAGE: 'invoice.manage',
  INVOICE_PRINT: 'invoice.print',
  PAYMENT_RECORD: 'payment.record',

  DASHBOARD_VIEW: 'dashboard.view',
  REPORT_VIEW: 'report.view',

  USER_MANAGE: 'user.manage',
  COMPANY_MANAGE: 'company.manage',
  DOC_NUMBER_MANAGE: 'doc_number.manage',
  TEMPLATE_MANAGE: 'template.manage',
  BACKUP_MANAGE: 'backup.manage',
  AUDIT_LOG_VIEW: 'audit_log.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS);

export const ROLE_DEFINITIONS = {
  ADMIN: {
    name: 'Administrator',
    description: 'จัดการผู้ใช้ สิทธิ์ ตั้งค่าบริษัท และดูข้อมูลทั้งหมด',
    permissions: ALL_PERMISSION_KEYS,
  },
  SALES: {
    name: 'Sales',
    description: 'สร้างและแก้ไขใบเสนอราคาของตนเอง ห้ามเห็นราคาทุน',
    permissions: [
      PERMISSIONS.CUSTOMER_VIEW,
      PERMISSIONS.CUSTOMER_MANAGE,
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.QUOTATION_VIEW_OWN,
      PERMISSIONS.QUOTATION_CREATE,
      PERMISSIONS.QUOTATION_EDIT_OWN,
      PERMISSIONS.QUOTATION_EXPORT_PDF,
      PERMISSIONS.DASHBOARD_VIEW,
    ],
  },
  SALES_MANAGER: {
    name: 'Sales Manager',
    description: 'ดูใบเสนอราคาทั้งหมด ดูต้นทุน/กำไร/GP อนุมัติส่วนลดและใบเสนอราคา',
    permissions: [
      PERMISSIONS.CUSTOMER_VIEW,
      PERMISSIONS.CUSTOMER_MANAGE,
      PERMISSIONS.CUSTOMER_IMPORT_EXPORT,
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.PRODUCT_VIEW_COST,
      PERMISSIONS.PRODUCT_MANAGE,
      PERMISSIONS.QUOTATION_VIEW_ALL,
      PERMISSIONS.QUOTATION_CREATE,
      PERMISSIONS.QUOTATION_EDIT_ALL,
      PERMISSIONS.QUOTATION_VIEW_COST,
      PERMISSIONS.QUOTATION_APPROVE,
      PERMISSIONS.QUOTATION_EXPORT_PDF,
      PERMISSIONS.QUOTATION_CANCEL,
      PERMISSIONS.SALES_ORDER_MANAGE,
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.REPORT_VIEW,
    ],
  },
  ACCOUNTING: {
    name: 'Accounting',
    description: 'ออกใบแจ้งหนี้ ใบกำกับภาษี ใบเสร็จ และบันทึกการรับชำระเงิน',
    permissions: [
      PERMISSIONS.CUSTOMER_VIEW,
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.QUOTATION_VIEW_ALL,
      PERMISSIONS.QUOTATION_EXPORT_PDF,
      PERMISSIONS.SALES_ORDER_MANAGE,
      PERMISSIONS.DELIVERY_NOTE_MANAGE,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.INVOICE_MANAGE,
      PERMISSIONS.INVOICE_PRINT,
      PERMISSIONS.PAYMENT_RECORD,
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.REPORT_VIEW,
    ],
  },
  VIEWER: {
    name: 'Viewer',
    description: 'ดูเอกสารอย่างเดียว ห้ามแก้ไข ห้ามลบ ห้ามดูต้นทุน',
    permissions: [
      PERMISSIONS.CUSTOMER_VIEW,
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.QUOTATION_VIEW_ALL,
      PERMISSIONS.INVOICE_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
    ],
  },
} as const;

export type RoleKeyName = keyof typeof ROLE_DEFINITIONS;
