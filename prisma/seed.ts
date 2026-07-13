import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ALL_PERMISSION_KEYS, ROLE_DEFINITIONS } from '../src/lib/permissions';
import { calcQuotationTotals } from '../src/lib/calc';
import { bahtText, round2 } from '../src/lib/money';
import { generateDocNumber } from '../src/lib/docNumber';
import {
  buildDefaultTemplateConfig,
  DEFAULT_ITEM_COLUMNS,
  type DocumentTemplateConfig,
  type ItemColumnKey,
} from '../src/lib/pdf/templateConfig';

const prisma = new PrismaClient();

async function seedPermissionsAndRoles() {
  for (const key of ALL_PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, group: key.split('.')[0] },
    });
  }

  for (const [roleKey, def] of Object.entries(ROLE_DEFINITIONS)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey as keyof typeof ROLE_DEFINITIONS },
      update: { name: def.name, description: def.description },
      create: { key: roleKey as keyof typeof ROLE_DEFINITIONS, name: def.name, description: def.description },
    });

    // Sync role_permissions to exactly match the definition.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const permissions = await prisma.permission.findMany({
      where: { key: { in: def.permissions as unknown as string[] } },
    });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  console.log(`Seeded ${ALL_PERMISSION_KEYS.length} permissions and ${Object.keys(ROLE_DEFINITIONS).length} roles.`);
}

async function seedUsers() {
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'ADMIN' } });
  const salesRole = await prisma.role.findUniqueOrThrow({ where: { key: 'SALES' } });
  const salesManagerRole = await prisma.role.findUniqueOrThrow({ where: { key: 'SALES_MANAGER' } });
  const accountingRole = await prisma.role.findUniqueOrThrow({ where: { key: 'ACCOUNTING' } });
  const viewerRole = await prisma.role.findUniqueOrThrow({ where: { key: 'VIEWER' } });

  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'P@ssw0rd';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@acy.local';

  const users = [
    {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      fullName: 'ผู้ดูแลระบบ',
      roleId: adminRole.id,
      canViewCost: true,
    },
    {
      username: 'sales1',
      email: 'sales1@acy.local',
      password: 'Sales@12345',
      fullName: 'พนักงานขาย หนึ่ง',
      roleId: salesRole.id,
      canViewCost: false,
    },
    {
      username: 'salesmgr1',
      email: 'salesmgr1@acy.local',
      password: 'SalesMgr@12345',
      fullName: 'ผู้จัดการฝ่ายขาย',
      roleId: salesManagerRole.id,
      canViewCost: true,
    },
    {
      username: 'account1',
      email: 'account1@acy.local',
      password: 'Account@12345',
      fullName: 'เจ้าหน้าที่บัญชี',
      roleId: accountingRole.id,
      canViewCost: false,
    },
    {
      username: 'viewer1',
      email: 'viewer1@acy.local',
      password: 'Viewer@12345',
      fullName: 'ผู้เยี่ยมชม',
      roleId: viewerRole.id,
      canViewCost: false,
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        roleId: u.roleId,
        canViewCost: u.canViewCost,
        mustChangePassword: u.username === adminUsername,
      },
    });
  }

  console.log(`Seeded ${users.length} users. Default accounts (see README for the full table):`);
  for (const u of users) console.log(`  - ${u.username} / ${u.password}`);
}

async function seedCompany() {
  const existing = await prisma.company.findFirst();
  if (existing) return existing;

  const company = await prisma.company.create({
    data: {
      nameTh: 'บริษัท เอซีวาย ซิสเต็มส์แอนด์เน็ตเวิร์ค จำกัด',
      nameEn: 'ACY SYSTEMS AND NETWORK CO., LTD.',
      taxId: '0765567002690',
      addressTh: '203/1 หมู่ 1 ต.บ้านลาด อ.บ้านลาด จ.เพชรบุรี 76150',
      phone: '065-5146455',
      email: 'chaiya.kli@gmail.com',
      website: '',
      primaryColor: '#0F4C81',
      standardTerms:
        'ราคานี้ยังไม่รวมภาษีมูลค่าเพิ่ม 7% / ยืนราคา 30 วันนับจากวันที่เสนอราคา / ระยะเวลาส่งมอบสินค้า 7-14 วันทำการหลังยืนยันคำสั่งซื้อ',
      footerText: 'ขอบคุณที่ให้ความไว้วางใจ บริษัท เอซีวาย ซิสเต็มส์แอนด์เน็ตเวิร์ค จำกัด',
      branches: {
        create: [{ code: 'HQ', name: 'สำนักงานใหญ่', isHeadOffice: true }],
      },
      bankAccounts: {
        create: [
          {
            bankName: 'ธนาคารกสิกรไทย',
            accountName: 'บริษัท เอซีวาย ซิสเต็มส์แอนด์เน็ตเวิร์ค จำกัด',
            accountNumber: '000-0-00000-0',
            branchName: 'สาขาบ้านลาด',
            isDefault: true,
          },
        ],
      },
    },
  });

  console.log('Seeded company: ACY SYSTEMS AND NETWORK CO., LTD.');
  return company;
}

type ConfigOverrides = {
  [K in keyof DocumentTemplateConfig]?: Partial<DocumentTemplateConfig[K]>;
};

function buildPresetConfig(overrides: ConfigOverrides): DocumentTemplateConfig {
  const base = buildDefaultTemplateConfig();
  return {
    general: { ...base.general, ...overrides.general },
    header: { ...base.header, ...overrides.header },
    customer: { ...base.customer, ...overrides.customer },
    itemTable: { ...base.itemTable, ...overrides.itemTable },
    summary: { ...base.summary, ...overrides.summary },
    signature: { ...base.signature, ...overrides.signature },
    sections: { ...base.sections, ...overrides.sections },
  };
}

function columnsWithVisibility(hidden: ItemColumnKey[]) {
  return DEFAULT_ITEM_COLUMNS.map((c) => (hidden.includes(c.key) ? { ...c, visible: false } : { ...c }));
}

async function seedDocumentTemplates() {
  const existing = await prisma.documentTemplate.findFirst({ where: { name: 'ACY Classic' } });
  if (existing) return;

  // Pre-existing rows from before the configurable Template Engine (no
  // `config` JSON) are legacy and no longer resolved by
  // resolveTemplateConfig - clear their isDefault flag so the new "ACY
  // Classic" preset below becomes the one true default per doc type.
  const legacyDefaults = await prisma.documentTemplate.findMany({ where: { isDefault: true } });
  const legacyIds = legacyDefaults.filter((t) => !t.config).map((t) => t.id);
  if (legacyIds.length > 0) {
    await prisma.documentTemplate.updateMany({ where: { id: { in: legacyIds } }, data: { isDefault: false } });
  }

  await prisma.documentTemplate.createMany({
    data: [
      {
        name: 'ACY Classic',
        description: 'รูปแบบมาตรฐานใกล้เคียงใบเสนอราคากระดาษจริงของ ACY',
        isDefault: true,
        applicableDocTypes: ['QUOTATION', 'INVOICE', 'TAX_INVOICE', 'RECEIPT', 'DELIVERY_NOTE'],
        config: buildPresetConfig({}),
      },
      {
        name: 'ACY Modern',
        description: 'โทนสีทันสมัย เส้นขอบบางลง หัวเอกสารแบบย่อในหน้าถัดไป',
        applicableDocTypes: ['QUOTATION', 'INVOICE', 'TAX_INVOICE', 'RECEIPT'],
        config: buildPresetConfig({
          general: { primaryColor: '#0EA5A5', borderColor: '#CBD5E1', borderWidthPx: 1, fontFamily: 'Sarabun' },
          header: { compactHeaderFollowingPages: true, fullHeaderFirstPage: true },
          itemTable: { headerBackground: '#E6FFFA' },
        }),
      },
      {
        name: 'ACY Compact',
        description: 'ระยะขอบและระยะห่างแคบลง เหมาะสำหรับเอกสารรายการเยอะ ต้องการหน้ากระดาษน้อยที่สุด',
        applicableDocTypes: ['QUOTATION', 'INVOICE', 'RECEIPT'],
        config: buildPresetConfig({
          general: { marginTopMm: 18, marginBottomMm: 8, marginLeftMm: 8, marginRightMm: 8, fontSizeBase: 9 },
          itemTable: { rowPaddingPx: 3, fontSizePt: 8 },
          header: { companyNameFontSizePt: 10 },
        }),
      },
      {
        name: 'ACY Product Image',
        description: 'แสดงรูปสินค้าประกอบแต่ละรายการในตาราง',
        applicableDocTypes: ['QUOTATION'],
        config: buildPresetConfig({
          itemTable: { showProductImage: true, productImageMode: 'SMALL', showSpec: true, specMode: 'BRIEF' },
        }),
      },
      {
        name: 'ACY Technical Specification',
        description: 'แสดงรายละเอียดสเปกสินค้าแบบเต็ม พร้อมรูปขนาดกลาง เหมาะกับงานวิศวกรรม',
        applicableDocTypes: ['QUOTATION'],
        config: buildPresetConfig({
          itemTable: {
            showProductImage: true,
            productImageMode: 'MEDIUM',
            showSpec: true,
            specMode: 'FULL',
            columns: DEFAULT_ITEM_COLUMNS.map((c) => (c.key === 'name' ? { ...c, widthMm: 90 } : c)),
          },
        }),
      },
      {
        name: 'ACY BOQ',
        description: 'Bill of Quantities - เน้นรหัส/จำนวน/หน่วย เหมาะกับงานโครงการและงานติดตั้ง',
        applicableDocTypes: ['QUOTATION'],
        config: buildPresetConfig({
          itemTable: { columns: columnsWithVisibility(['discount']) },
          sections: { showProjectSection: true },
        }),
      },
      {
        name: 'ACY Lump Sum',
        description: 'แสดงราคาเหมารวม ซ่อนราคาต่อหน่วยและส่วนลดรายรายการจากลูกค้า',
        applicableDocTypes: ['QUOTATION'],
        config: buildPresetConfig({
          itemTable: {
            columns: DEFAULT_ITEM_COLUMNS.map((c) =>
              c.key === 'unitPrice' || c.key === 'discount' ? { ...c, visible: false } : c.key === 'lineTotal' ? { ...c, label: 'ราคาเหมารวม' } : c,
            ),
          },
          summary: { showSubtotal: false, showDiscount: false },
        }),
      },
    ],
  });

  console.log('Seeded 7 document template presets.');
}

async function seedSettings() {
  const defaults: Record<string, string> = {
    'quotation.minGpPercent': process.env.DEFAULT_MIN_GP_PERCENT ?? '15',
    'quotation.maxDiscountPercentWithoutApproval': '15',
    'quotation.defaultValidUntilDays': '30',
    'company.defaultVatRate': process.env.DEFAULT_VAT_RATE ?? '7',
    'backup.retentionDays': process.env.BACKUP_RETENTION_DAYS ?? '30',
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log('Seeded default settings.');
}

async function seedSampleCustomers() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });
  const existing = await prisma.customer.count();
  if (existing > 0) return;

  await prisma.customer.createMany({
    data: [
      {
        code: 'CUS-0001',
        type: 'COMPANY',
        name: 'บริษัท พฤกษา เทคโนโลยี จำกัด',
        contactName: 'คุณวรรณา ใจงาม',
        address: '88 อาคารพฤกษา ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพมหานคร 10110',
        province: 'กรุงเทพมหานคร',
        postalCode: '10110',
        phone: '02-661-2233',
        email: 'purchasing@pruksatech.example.com',
        taxId: '0105561000123',
        isHeadOffice: true,
        creditTermDays: 30,
        defaultDiscountPercent: 0,
        status: 'ACTIVE',
        createdById: admin.id,
      },
      {
        code: 'CUS-0002',
        type: 'COMPANY',
        name: 'ห้างหุ้นส่วนจำกัด ไทยวัฒนาก่อสร้าง',
        contactName: 'คุณประเสริฐ มั่นคง',
        address: '45/2 หมู่ 3 ต.บ้านลาด อ.บ้านลาด จ.เพชรบุรี 76150',
        province: 'เพชรบุรี',
        postalCode: '76150',
        phone: '032-441-7788',
        email: 'contact@thaiwattana.example.com',
        taxId: '0765555001112',
        isHeadOffice: false,
        branchName: 'สาขาเพชรบุรี',
        branchCode: '00002',
        creditTermDays: 15,
        defaultDiscountPercent: 3,
        status: 'ACTIVE',
        createdById: admin.id,
      },
      {
        code: 'CUS-0003',
        type: 'INDIVIDUAL',
        name: 'คุณอนุชา ศรีสุข',
        contactName: 'คุณอนุชา ศรีสุข',
        address: '12/5 ซอยลาดพร้าว 34 แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร 10900',
        province: 'กรุงเทพมหานคร',
        postalCode: '10900',
        phone: '081-234-5678',
        email: 'anucha.s@example.com',
        isHeadOffice: true,
        creditTermDays: 0,
        status: 'ACTIVE',
        createdById: admin.id,
      },
    ],
  });
  console.log('Seeded 3 sample customers.');
}

async function seedSampleProducts() {
  const existing = await prisma.product.count();
  if (existing > 0) return;

  const supplier = await prisma.supplier.create({
    data: { name: 'บริษัท เน็ตเวิร์ค ซัพพลาย จำกัด', phone: '02-500-1234', email: 'sales@netsupply.example.com' },
  });
  const category = await prisma.productCategory.create({ data: { name: 'อุปกรณ์เครือข่าย (Network Equipment)' } });

  await prisma.product.createMany({
    data: [
      {
        code: 'NET-SW24',
        sku: 'CIS-SG350-24P',
        name: 'สวิตช์เครือข่าย 24 พอร์ต POE',
        nameEn: 'Cisco SG350-24P 24-Port PoE Switch',
        brand: 'Cisco',
        model: 'SG350-24P',
        categoryId: category.id,
        unit: 'เครื่อง',
        description: 'สวิตช์ Managed Layer 2/3 รองรับ PoE+ 24 พอร์ต เหมาะสำหรับงานติดตั้งกล้องวงจรปิดและ Access Point',
        countryOfOrigin: 'จีน',
        supplierId: supplier.id,
        costPrice: 18500,
        installCostPrice: 1500,
        sellPrice: 24900,
        installSellPrice: 2500,
        standardSellPrice: 24900,
        warrantyText: 'รับประกัน 3 ปี',
      },
      {
        code: 'NET-AP01',
        sku: 'UBNT-U6-LR',
        name: 'Access Point ไร้สาย Wi-Fi 6',
        nameEn: 'Ubiquiti UniFi U6-LR Access Point',
        brand: 'Ubiquiti',
        model: 'U6-LR',
        categoryId: category.id,
        unit: 'เครื่อง',
        description: 'Access Point มาตรฐาน Wi-Fi 6 รองรับผู้ใช้งานพร้อมกันได้มากกว่า 300 อุปกรณ์',
        countryOfOrigin: 'สหรัฐอเมริกา',
        supplierId: supplier.id,
        costPrice: 5200,
        installCostPrice: 800,
        sellPrice: 7500,
        installSellPrice: 1200,
        standardSellPrice: 7500,
        warrantyText: 'รับประกัน 2 ปี',
      },
      {
        code: 'NET-CAB6',
        sku: 'LINK-UTP-CAT6',
        name: 'สาย LAN Cat6 UTP (กล่อง 305 เมตร)',
        nameEn: 'Cat6 UTP Cable 305m Box',
        brand: 'Link',
        model: 'US-9106',
        categoryId: category.id,
        unit: 'กล่อง',
        description: 'สายสัญญาณ Cat6 มาตรฐาน UTP ความยาว 305 เมตรต่อกล่อง',
        countryOfOrigin: 'ไทย',
        supplierId: supplier.id,
        costPrice: 1800,
        sellPrice: 2500,
        standardSellPrice: 2500,
        warrantyText: 'รับประกัน 5 ปี',
      },
      {
        code: 'NET-NVR16',
        sku: 'HIK-NVR16P',
        name: 'เครื่องบันทึกภาพกล้องวงจรปิด NVR 16 ช่อง',
        nameEn: 'Hikvision 16-Channel NVR with PoE',
        brand: 'Hikvision',
        model: 'DS-7616NI-K2/16P',
        categoryId: category.id,
        unit: 'เครื่อง',
        description: 'รองรับกล้อง IP 16 ช่อง พร้อม PoE ในตัว บันทึกความละเอียดสูงสุด 8MP',
        countryOfOrigin: 'จีน',
        supplierId: supplier.id,
        costPrice: 9800,
        installCostPrice: 1000,
        sellPrice: 13900,
        installSellPrice: 1800,
        standardSellPrice: 13900,
        warrantyText: 'รับประกัน 2 ปี',
      },
      {
        code: 'NET-CAM01',
        sku: 'HIK-IPCAM-4MP',
        name: 'กล้องวงจรปิด IP Camera 4MP',
        nameEn: 'Hikvision 4MP IP Camera',
        brand: 'Hikvision',
        model: 'DS-2CD1043G0-I',
        categoryId: category.id,
        unit: 'ตัว',
        description: 'กล้อง IP ความละเอียด 4MP มองเห็นกลางคืนสูงสุด 30 เมตร',
        countryOfOrigin: 'จีน',
        supplierId: supplier.id,
        costPrice: 2100,
        installCostPrice: 500,
        sellPrice: 3200,
        installSellPrice: 800,
        standardSellPrice: 3200,
        warrantyText: 'รับประกัน 2 ปี',
      },
    ],
  });
  console.log('Seeded 5 sample products.');
}

/** Creates one realistic sample Quotation and, for showcase purposes, walks
 *  it through the full document workflow (Sales Order -> Delivery Note ->
 *  Invoice -> Payment -> Receipt) so a fresh install has a working example
 *  of every document type (spec section 34: "ตัวอย่างใบเสนอราคา ACY",
 *  "ตัวอย่าง Invoice", "ตัวอย่าง Receipt", "ตัวอย่าง Original/Copy"). */
async function seedSampleQuotationWithFullChain() {
  const alreadySeeded = await prisma.quotation.findFirst({ where: { projectName: { contains: 'ตัวอย่าง' } } });
  if (alreadySeeded) return;

  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });
  const customer = await prisma.customer.findUniqueOrThrow({ where: { code: 'CUS-0001' } });
  const products = await prisma.product.findMany({ where: { code: { in: ['NET-SW24', 'NET-AP01', 'NET-CAB6'] } } });
  const sw = products.find((p) => p.code === 'NET-SW24')!;
  const ap = products.find((p) => p.code === 'NET-AP01')!;
  const cable = products.find((p) => p.code === 'NET-CAB6')!;

  const itemDefs = [
    { itemType: 'HEADING' as const, name: 'งานติดตั้งระบบเครือข่ายภายในสำนักงาน', qty: 0, unitPrice: 0, unitCost: 0 },
    {
      itemType: 'PRODUCT' as const,
      productId: sw.id,
      code: sw.code,
      name: sw.name,
      description: sw.description,
      qty: 2,
      unit: sw.unit,
      unitPrice: Number(sw.sellPrice),
      unitCost: Number(sw.costPrice),
    },
    {
      itemType: 'PRODUCT' as const,
      productId: ap.id,
      code: ap.code,
      name: ap.name,
      description: ap.description,
      qty: 6,
      unit: ap.unit,
      unitPrice: Number(ap.sellPrice),
      unitCost: Number(ap.costPrice),
      discountPercent: 5,
    },
    {
      itemType: 'PRODUCT' as const,
      productId: cable.id,
      code: cable.code,
      name: cable.name,
      description: cable.description,
      qty: 3,
      unit: cable.unit,
      unitPrice: Number(cable.sellPrice),
      unitCost: Number(cable.costPrice),
    },
    {
      itemType: 'SERVICE' as const,
      code: 'SRV-INSTALL',
      name: 'ค่าแรงติดตั้งและเดินสายสัญญาณทั้งระบบ',
      description: 'รวมค่าแรงช่างผู้เชี่ยวชาญ เดินสาย Label และทดสอบระบบ',
      qty: 1,
      unit: 'งาน',
      unitPrice: 15000,
      unitCost: 8000,
    },
    { itemType: 'TEXT' as const, name: 'ค่าเดินทางและที่พัก รวมอยู่ในราคาแล้ว ไม่มีค่าใช้จ่ายเพิ่มเติม', qty: 0, unitPrice: 0, unitCost: 0 },
  ];

  const totals = calcQuotationTotals({
    items: itemDefs.map((i) => ({
      itemType: i.itemType,
      qty: i.qty,
      unitPrice: i.unitPrice,
      unitCost: i.unitCost,
      discountPercent: ('discountPercent' in i ? i.discountPercent : 0) ?? 0,
    })),
    vatEnabled: true,
    vatRate: 7,
    whtEnabled: false,
    whtRate: 0,
  });

  const docNumber = await generateDocNumber('QUOTATION');

  const quotation = await prisma.quotation.create({
    data: {
      docNumber,
      customerId: customer.id,
      contactName: customer.contactName,
      projectName: 'ตัวอย่าง: โครงการติดตั้งระบบเครือข่าย สำนักงานใหญ่',
      title: 'ใบเสนอราคางานติดตั้งระบบเครือข่ายและ Wi-Fi ภายในอาคาร',
      deliveryTerms: '10 วันทำการหลังยืนยันคำสั่งซื้อ',
      creditTermDays: customer.creditTermDays,
      paymentTerms: 'ชำระเงิน 100% หลังส่งมอบงานและตรวจรับเรียบร้อย',
      vatEnabled: true,
      vatRate: 7,
      preparedById: admin.id,
      status: 'APPROVED',
      approvedById: admin.id,
      approvedAt: new Date(),
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      amountAfterDiscount: totals.amountAfterDiscount,
      vatAmount: totals.vatAmount,
      whtAmount: totals.whtAmount,
      netTotal: totals.netTotal,
      amountInWordsTh: bahtText(totals.netTotal),
      totalCost: totals.totalCost,
      totalProfit: totals.totalProfit,
      gpPercent: totals.gpPercent,
      markupPercent: totals.markupPercent,
      items: {
        create: itemDefs.map((i, idx) => {
          const discountPercent = ('discountPercent' in i ? i.discountPercent : 0) ?? 0;
          const discountAmount = round2((i.qty * i.unitPrice * discountPercent) / 100);
          const lineTotal = i.itemType === 'TEXT' || i.itemType === 'HEADING' ? 0 : round2(i.qty * i.unitPrice - discountAmount);
          const lineCost = i.itemType === 'TEXT' || i.itemType === 'HEADING' ? 0 : round2(i.qty * i.unitCost);
          return {
            sortOrder: idx,
            itemType: i.itemType,
            productId: 'productId' in i ? i.productId : undefined,
            code: 'code' in i ? i.code : undefined,
            name: i.name,
            description: 'description' in i ? i.description : undefined,
            qty: i.qty,
            unit: 'unit' in i ? i.unit : undefined,
            unitPrice: i.unitPrice,
            unitCost: i.unitCost,
            discountPercent,
            discountAmount,
            lineTotal,
            lineCost,
          };
        }),
      },
    },
    include: { items: true },
  });

  const soDocNumber = await generateDocNumber('SALES_ORDER');
  const salesOrder = await prisma.salesOrder.create({
    data: {
      docNumber: soDocNumber,
      quotationId: quotation.id,
      status: 'DELIVERED',
      items: {
        create: quotation.items
          .filter((i) => i.itemType !== 'HEADING')
          .map((i, idx) => ({
            sortOrder: idx,
            itemType: i.itemType,
            code: i.code,
            name: i.name,
            description: i.description,
            qty: i.qty,
            unit: i.unit,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
            discountAmount: i.discountAmount,
            lineTotal: i.lineTotal,
          })),
      },
    },
    include: { items: true },
  });

  const dnDocNumber = await generateDocNumber('DELIVERY_NOTE');
  await prisma.deliveryNote.create({
    data: {
      docNumber: dnDocNumber,
      salesOrderId: salesOrder.id,
      status: 'DELIVERED',
      receivedByName: customer.contactName ?? customer.name,
      items: {
        create: salesOrder.items.map((i, idx) => ({
          sortOrder: idx,
          code: i.code,
          name: i.name,
          description: i.description,
          qty: i.qty,
          unit: i.unit,
        })),
      },
    },
  });

  const invDocNumber = await generateDocNumber('INVOICE');
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + customer.creditTermDays);

  const invoice = await prisma.invoice.create({
    data: {
      docNumber: invDocNumber,
      docType: 'INVOICE',
      customerId: customer.id,
      quotationId: quotation.id,
      salesOrderId: salesOrder.id,
      issueDate,
      dueDate,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      amountAfterDiscount: totals.amountAfterDiscount,
      vatRate: 7,
      vatAmount: totals.vatAmount,
      netTotal: totals.netTotal,
      amountInWordsTh: bahtText(totals.netTotal),
      balanceAmount: totals.netTotal,
      status: 'UNPAID',
      createdById: admin.id,
      items: {
        create: quotation.items
          .filter((i) => i.itemType !== 'HEADING')
          .map((i, idx) => ({
            sortOrder: idx,
            itemType: i.itemType,
            code: i.code,
            name: i.name,
            description: i.description,
            qty: i.qty,
            unit: i.unit,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
            discountAmount: i.discountAmount,
            lineTotal: i.lineTotal,
          })),
      },
    },
  });

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      paidDate: new Date(),
      amount: totals.netTotal,
      method: 'TRANSFER',
      refNumber: 'TRF-SAMPLE-0001',
      bankName: 'ธนาคารกสิกรไทย',
      recordedById: admin.id,
    },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { paidAmount: totals.netTotal, balanceAmount: 0, status: 'PAID' },
  });

  const receiptDocNumber = await generateDocNumber('RECEIPT');
  await prisma.receipt.create({
    data: {
      docNumber: receiptDocNumber,
      invoiceId: invoice.id,
      paymentId: payment.id,
      receiptDate: payment.paidDate,
      amount: totals.netTotal,
    },
  });

  console.log(
    `Seeded sample document chain: ${quotation.docNumber} -> ${salesOrder.docNumber} -> ${dnDocNumber} -> ${invoice.docNumber} -> ${receiptDocNumber}`,
  );
}

/** A deliberately long quotation (40+ line items) used to exercise and
 *  demonstrate automatic PDF pagination (spec section 34: "PDF Test
 *  หลายหน้า"): repeating header/logo/customer name, repeating column
 *  headers, and totals+signatures on the last page only. */
async function seedMultiPagePdfTestQuotation() {
  const alreadySeeded = await prisma.quotation.findFirst({ where: { projectName: { contains: 'ทดสอบ PDF หลายหน้า' } } });
  if (alreadySeeded) return;

  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

  const customer = await prisma.customer.upsert({
    where: { code: 'CUS-TEST-001' },
    update: {},
    create: {
      code: 'CUS-TEST-001',
      type: 'COMPANY',
      name: 'บริษัท ทดสอบระบบ จำกัด',
      contactName: 'คุณทดสอบ ใจดี',
      address: '99/9 อาคารทดสอบ ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
      province: 'กรุงเทพมหานคร',
      postalCode: '10310',
      phone: '02-999-8888',
      email: 'test@example.com',
      taxId: '1234567890123',
      isHeadOffice: true,
      creditTermDays: 30,
      createdById: admin.id,
    },
  });

  const items: { itemType: 'HEADING' | 'PRODUCT' | 'SERVICE' | 'TEXT' | 'LUMP_SUM'; code?: string; name: string; description?: string; qty: number; unit?: string; unitPrice: number; unitCost: number; discountPercent?: number; hideUnitPrice?: boolean }[] = [];

  items.push({ itemType: 'HEADING', name: 'งานติดตั้งระบบเครือข่าย (Network Installation)', qty: 0, unitPrice: 0, unitCost: 0 });
  for (let i = 1; i <= 25; i++) {
    items.push({
      itemType: 'PRODUCT',
      code: `NET-${String(i).padStart(3, '0')}`,
      name: `สาย LAN Cat6 UTP ความยาว ${i * 10} เมตร รุ่นทดสอบที่ ${i}`,
      description: 'สายสัญญาณคุณภาพสูง ทนทานต่อสภาพอากาศ พร้อมการรับประกัน 5 ปี',
      qty: i,
      unit: 'ม้วน',
      unitPrice: 1200 + i * 15,
      unitCost: 850 + i * 10,
    });
  }
  items.push({ itemType: 'HEADING', name: 'งานติดตั้งและบริการ (Installation Services)', qty: 0, unitPrice: 0, unitCost: 0 });
  for (let i = 1; i <= 15; i++) {
    items.push({
      itemType: 'SERVICE',
      code: `SRV-${String(i).padStart(3, '0')}`,
      name: `ค่าแรงติดตั้งอุปกรณ์ Access Point จุดที่ ${i}`,
      description: 'รวมค่าแรงช่างผู้เชี่ยวชาญ และทดสอบสัญญาณหลังติดตั้ง',
      qty: 1,
      unit: 'จุด',
      unitPrice: 2500,
      unitCost: 1500,
      discountPercent: i % 5 === 0 ? 5 : 0,
    });
  }
  items.push({ itemType: 'TEXT', name: 'ค่าเดินทางและที่พักสำหรับทีมช่างต่างจังหวัด (เหมาจ่ายตลอดโครงการ)', qty: 0, unitPrice: 0, unitCost: 0 });
  items.push({
    itemType: 'LUMP_SUM',
    name: 'งานเดินสายไฟเบอร์ออฟติก พร้อมอุปกรณ์ครบชุด (เหมารวม)',
    qty: 1,
    unitPrice: 185000,
    unitCost: 132000,
    hideUnitPrice: true,
  });

  const totals = calcQuotationTotals({
    items: items.map((i) => ({ itemType: i.itemType, qty: i.qty, unitPrice: i.unitPrice, unitCost: i.unitCost, discountPercent: i.discountPercent ?? 0 })),
    vatEnabled: true,
    vatRate: 7,
    whtEnabled: true,
    whtRate: 3,
  });

  const docNumber = await generateDocNumber('QUOTATION');

  await prisma.quotation.create({
    data: {
      docNumber,
      customerId: customer.id,
      contactName: customer.contactName,
      projectName: 'โครงการติดตั้งระบบเครือข่าย อาคารสำนักงานใหญ่ (ทดสอบ PDF หลายหน้า)',
      title: 'ใบเสนอราคางานติดตั้งระบบ Network และ Fiber Optic',
      deliveryTerms: '7-14 วันทำการหลังยืนยันคำสั่งซื้อ',
      creditTermDays: 30,
      paymentTerms: 'ชำระเงิน 50% เมื่อสั่งซื้อ ส่วนที่เหลือชำระเมื่องานแล้วเสร็จ',
      vatEnabled: true,
      vatRate: 7,
      whtEnabled: true,
      whtRate: 3,
      note: 'เอกสารนี้สร้างขึ้นเพื่อทดสอบการแบ่งหน้า PDF อัตโนมัติ (Sample data for multi-page PDF testing)',
      preparedById: admin.id,
      status: 'APPROVED',
      approvedById: admin.id,
      approvedAt: new Date(),
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      amountAfterDiscount: totals.amountAfterDiscount,
      vatAmount: totals.vatAmount,
      whtAmount: totals.whtAmount,
      netTotal: totals.netTotal,
      amountInWordsTh: bahtText(totals.netTotal),
      totalCost: totals.totalCost,
      totalProfit: totals.totalProfit,
      gpPercent: totals.gpPercent,
      markupPercent: totals.markupPercent,
      items: {
        create: items.map((i, idx) => {
          const discountPercent = i.discountPercent ?? 0;
          const discountAmount = round2((i.qty * i.unitPrice * discountPercent) / 100);
          const lineTotal = i.itemType === 'TEXT' || i.itemType === 'HEADING' ? 0 : round2(i.qty * i.unitPrice - discountAmount);
          const lineCost = i.itemType === 'TEXT' || i.itemType === 'HEADING' ? 0 : round2(i.qty * i.unitCost);
          return {
            sortOrder: idx,
            itemType: i.itemType,
            code: i.code,
            name: i.name,
            description: i.description,
            qty: i.qty,
            unit: i.unit,
            unitPrice: i.unitPrice,
            unitCost: i.unitCost,
            discountPercent,
            discountAmount,
            lineTotal,
            lineCost,
            hideUnitPrice: i.hideUnitPrice ?? false,
          };
        }),
      },
    },
  });

  console.log(`Seeded multi-page PDF test quotation: ${docNumber} (41 line items, expect 4 pages).`);
}

async function main() {
  console.log('--- ACY Quotation System: database seed ---');
  await seedPermissionsAndRoles();
  await seedUsers();
  await seedCompany();
  await seedDocumentTemplates();
  await seedSettings();
  await seedSampleCustomers();
  await seedSampleProducts();
  await seedSampleQuotationWithFullChain();
  await seedMultiPagePdfTestQuotation();
  console.log('--- Seed complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
