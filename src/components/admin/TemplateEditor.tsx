'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  documentTemplateConfigSchema,
  buildDefaultTemplateConfig,
  DEFAULT_ITEM_COLUMNS,
  type DocumentTemplateConfig,
  type ItemColumnConfig,
} from '@/lib/pdf/templateConfig';
import { buildSamplePrintData } from '@/lib/pdf/sampleData';
import { DocumentRenderer } from '@/components/print/DocumentRenderer';
import { useClientPageModel } from '@/components/print/useClientPageModel';
import {
  updateTemplateConfig,
  duplicateTemplate,
  resetTemplateToDefault,
  setDefaultTemplate,
  deleteTemplate,
} from '@/lib/actions/templates';

const DOC_TYPE_OPTIONS = [
  { value: 'QUOTATION', label: 'ใบเสนอราคา' },
  { value: 'INVOICE', label: 'ใบแจ้งหนี้' },
  { value: 'TAX_INVOICE', label: 'ใบกำกับภาษี' },
  { value: 'RECEIPT', label: 'ใบเสร็จรับเงิน' },
  { value: 'DELIVERY_NOTE', label: 'ใบส่งสินค้า' },
];

const ITEM_COUNT_PRESETS = [
  { label: '1 หน้า (4 รายการ)', value: 4 },
  { label: '2 หน้า (12 รายการ)', value: 12 },
  { label: '5 หน้า (35 รายการ)', value: 35 },
];

interface TemplateEditorProps {
  templateId: string;
  initialName: string;
  initialDescription: string;
  initialApplicableDocTypes: string[];
  initialIsDefault: boolean;
  initialConfig: DocumentTemplateConfig;
}

export function TemplateEditor({
  templateId,
  initialName,
  initialDescription,
  initialApplicableDocTypes,
  initialIsDefault,
  initialConfig,
}: TemplateEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [applicableDocTypes, setApplicableDocTypes] = useState<string[]>(initialApplicableDocTypes);
  const [isDefault, setIsDefault] = useState(initialIsDefault);
  const [config, setConfig] = useState<DocumentTemplateConfig>(initialConfig);
  const [itemCount, setItemCount] = useState(4);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateGroup<G extends keyof DocumentTemplateConfig>(group: G, patch: Partial<DocumentTemplateConfig[G]>) {
    setConfig((prev) => ({ ...prev, [group]: { ...prev[group], ...patch } }));
  }

  function updateColumn(key: string, patch: Partial<ItemColumnConfig>) {
    setConfig((prev) => ({
      ...prev,
      itemTable: {
        ...prev.itemTable,
        columns: prev.itemTable.columns.map((c) => (c.key === key ? { ...c, ...patch } : c)),
      },
    }));
  }

  function moveColumn(key: string, dir: -1 | 1) {
    setConfig((prev) => {
      const cols = [...prev.itemTable.columns];
      const idx = cols.findIndex((c) => c.key === key);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= cols.length) return prev;
      [cols[idx], cols[swapIdx]] = [cols[swapIdx], cols[idx]];
      return { ...prev, itemTable: { ...prev.itemTable, columns: cols } };
    });
  }

  function updateSignatureBox(idx: number, patch: Partial<DocumentTemplateConfig['signature']['boxes'][number]>) {
    setConfig((prev) => ({
      ...prev,
      signature: {
        ...prev.signature,
        boxes: prev.signature.boxes.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
      },
    }));
  }

  function addSignatureBox() {
    setConfig((prev) => {
      if (prev.signature.boxes.length >= 4) return prev;
      return {
        ...prev,
        signature: {
          ...prev.signature,
          boxes: [...prev.signature.boxes, { label: 'ลงชื่อ', showSignatureImage: false, showStamp: false, showDateLine: true }],
        },
      };
    });
  }

  function removeSignatureBox(idx: number) {
    setConfig((prev) => ({
      ...prev,
      signature: { ...prev.signature, boxes: prev.signature.boxes.filter((_, i) => i !== idx) },
    }));
  }

  const sampleData = useMemo(() => buildSamplePrintData(config, itemCount), [config, itemCount]);
  const measureRef = useRef<HTMLDivElement>(null);
  const pageModel = useClientPageModel(sampleData, measureRef);

  async function handleSave() {
    setStatus(null);
    const result = documentTemplateConfigSchema.safeParse(config);
    if (!result.success) {
      setStatus('การตั้งค่าไม่ถูกต้อง: ' + result.error.issues.map((i) => i.message).join(', '));
      return;
    }
    startTransition(async () => {
      await updateTemplateConfig(templateId, { name, description: description || null, applicableDocTypes }, result.data);
      setStatus('บันทึกแล้ว');
    });
  }

  function handleReset() {
    if (!confirm('รีเซ็ต Template นี้กลับเป็นค่าเริ่มต้นหรือไม่?')) return;
    startTransition(async () => {
      const res = await resetTemplateToDefault(templateId);
      setConfig(res.config);
      setStatus('รีเซ็ตกลับเป็นค่าเริ่มต้นแล้ว (ยังไม่ได้บันทึก กด "บันทึก" เพื่อยืนยัน)');
    });
  }

  function handleDuplicate() {
    startTransition(() => duplicateTemplate(templateId));
  }

  function handleSetDefault() {
    startTransition(async () => {
      await setDefaultTemplate(templateId);
      setIsDefault(true);
      setStatus('ตั้งเป็น Template ค่าเริ่มต้นแล้ว');
    });
  }

  function handleDelete() {
    if (!confirm(`ลบ Template "${name}" ถาวรหรือไม่?`)) return;
    startTransition(async () => {
      await deleteTemplate(templateId);
      router.push('/admin/templates');
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      {/* ---------- Settings Panel ---------- */}
      <div className="space-y-4">
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-800">
              {name} {isDefault && <span className="badge bg-brand text-white">ค่าเริ่มต้น</span>}
            </h2>
          </div>
          <div>
            <label className="label">ชื่อ Template</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">คำอธิบาย</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label">ใช้กับเอกสารประเภท</label>
            <div className="flex flex-wrap gap-3 text-sm">
              {DOC_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={applicableDocTypes.includes(opt.value)}
                    onChange={(e) =>
                      setApplicableDocTypes((prev) =>
                        e.target.checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value),
                      )
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={handleSave} disabled={isPending} className="btn-primary text-sm">
              บันทึก
            </button>
            <button type="button" onClick={handleDuplicate} disabled={isPending} className="btn-secondary text-sm">
              ทำสำเนา
            </button>
            <button type="button" onClick={handleReset} disabled={isPending} className="btn-secondary text-sm">
              รีเซ็ต
            </button>
            {!isDefault && (
              <button type="button" onClick={handleSetDefault} disabled={isPending} className="btn-secondary text-sm">
                ตั้งเป็นค่าเริ่มต้น
              </button>
            )}
            <button type="button" onClick={handleDelete} disabled={isPending} className="btn-secondary text-sm text-red-600">
              ลบ
            </button>
          </div>
          {status && <p className="text-xs text-gray-600">{status}</p>}
        </div>

        {/* General */}
        <Section title="ทั่วไป (General)">
          <Row label="แนวกระดาษ">
            <select
              className="input"
              value={config.general.orientation}
              onChange={(e) => updateGroup('general', { orientation: e.target.value as 'portrait' | 'landscape' })}
            >
              <option value="portrait">แนวตั้ง</option>
              <option value="landscape">แนวนอน</option>
            </select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="ขอบบน (mm)" value={config.general.marginTopMm} onChange={(v) => updateGroup('general', { marginTopMm: v })} />
            <NumberField label="ขอบล่าง (mm)" value={config.general.marginBottomMm} onChange={(v) => updateGroup('general', { marginBottomMm: v })} />
            <NumberField label="ขอบซ้าย (mm)" value={config.general.marginLeftMm} onChange={(v) => updateGroup('general', { marginLeftMm: v })} />
            <NumberField label="ขอบขวา (mm)" value={config.general.marginRightMm} onChange={(v) => updateGroup('general', { marginRightMm: v })} />
          </div>
          <Row label="Font Family">
            <input className="input" value={config.general.fontFamily} onChange={(e) => updateGroup('general', { fontFamily: e.target.value })} />
          </Row>
          <NumberField label="ขนาดตัวอักษรพื้นฐาน (pt)" value={config.general.fontSizeBase} onChange={(v) => updateGroup('general', { fontSizeBase: v })} />
          <Row label="สีหลัก">
            <input type="color" className="h-9 w-full rounded border" value={config.general.primaryColor} onChange={(e) => updateGroup('general', { primaryColor: e.target.value })} />
          </Row>
          <Row label="สีเส้นขอบ">
            <input type="color" className="h-9 w-full rounded border" value={config.general.borderColor} onChange={(e) => updateGroup('general', { borderColor: e.target.value })} />
          </Row>
          <NumberField label="ความหนาเส้นขอบ (px)" value={config.general.borderWidthPx} onChange={(v) => updateGroup('general', { borderWidthPx: v })} />
        </Section>

        {/* Header */}
        <Section title="ส่วนหัว (Header)">
          <Checkbox label="แสดง Logo" checked={config.header.showLogo} onChange={(v) => updateGroup('header', { showLogo: v })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="ความกว้าง Logo (mm)" value={config.header.logoWidthMm} onChange={(v) => updateGroup('header', { logoWidthMm: v })} />
            <NumberField label="ความสูง Logo (mm)" value={config.header.logoHeightMm} onChange={(v) => updateGroup('header', { logoHeightMm: v })} />
          </div>
          <Row label="ตำแหน่ง Logo">
            <select className="input" value={config.header.logoPosition} onChange={(e) => updateGroup('header', { logoPosition: e.target.value as 'LEFT' | 'CENTER' | 'RIGHT' })}>
              <option value="LEFT">ซ้าย</option>
              <option value="CENTER">กลาง</option>
              <option value="RIGHT">ขวา</option>
            </select>
          </Row>
          <NumberField label="ขนาดชื่อบริษัท (pt)" value={config.header.companyNameFontSizePt} onChange={(v) => updateGroup('header', { companyNameFontSizePt: v })} />
          <Checkbox label="แสดงที่อยู่" checked={config.header.showAddress} onChange={(v) => updateGroup('header', { showAddress: v })} />
          <Checkbox label="แสดงเบอร์โทร" checked={config.header.showPhone} onChange={(v) => updateGroup('header', { showPhone: v })} />
          <Checkbox label="แสดงอีเมล" checked={config.header.showEmail} onChange={(v) => updateGroup('header', { showEmail: v })} />
          <Checkbox label="แสดงเลขผู้เสียภาษี" checked={config.header.showTaxId} onChange={(v) => updateGroup('header', { showTaxId: v })} />
          <Checkbox label="แสดงหัวเอกสารซ้ำทุกหน้า" checked={config.header.repeatEveryPage} onChange={(v) => updateGroup('header', { repeatEveryPage: v })} />
          <Checkbox label="หน้าแรกแสดงหัวเอกสารแบบเต็ม" checked={config.header.fullHeaderFirstPage} onChange={(v) => updateGroup('header', { fullHeaderFirstPage: v })} />
          <Checkbox label="หน้าถัดไปแสดงหัวเอกสารแบบย่อ" checked={config.header.compactHeaderFollowingPages} onChange={(v) => updateGroup('header', { compactHeaderFollowingPages: v })} />
        </Section>

        {/* Customer */}
        <Section title="ข้อมูลลูกค้า (Customer Section)">
          <Checkbox label="แสดงผู้ติดต่อ" checked={config.customer.showContact} onChange={(v) => updateGroup('customer', { showContact: v })} />
          <Checkbox label="แสดงเบอร์โทร" checked={config.customer.showPhone} onChange={(v) => updateGroup('customer', { showPhone: v })} />
          <Checkbox label="แสดงอีเมล" checked={config.customer.showEmail} onChange={(v) => updateGroup('customer', { showEmail: v })} />
          <Checkbox label="แสดงเลขผู้เสียภาษี" checked={config.customer.showTaxId} onChange={(v) => updateGroup('customer', { showTaxId: v })} />
          <Checkbox label="แสดงสำนักงานใหญ่/สาขา" checked={config.customer.showBranch} onChange={(v) => updateGroup('customer', { showBranch: v })} />
          <Row label="รูปแบบ">
            <select className="input" value={config.customer.layout} onChange={(e) => updateGroup('customer', { layout: e.target.value as '1col' | '2col' })}>
              <option value="2col">2 คอลัมน์</option>
              <option value="1col">1 คอลัมน์</option>
            </select>
          </Row>
        </Section>

        {/* Item Table */}
        <Section title="ตารางรายการสินค้า (Item Table)">
          <div className="space-y-1">
            {config.itemTable.columns.map((col, i) => (
              <div key={col.key} className="flex items-center gap-1 rounded border border-gray-200 p-1.5 text-xs">
                <input type="checkbox" checked={col.visible} onChange={(e) => updateColumn(col.key, { visible: e.target.checked })} />
                <input
                  className="input !py-0.5 flex-1"
                  value={col.label}
                  onChange={(e) => updateColumn(col.key, { label: e.target.value })}
                />
                <input
                  type="number"
                  className="input !py-0.5 w-16"
                  value={col.widthMm}
                  onChange={(e) => updateColumn(col.key, { widthMm: Number(e.target.value) })}
                  title="ความกว้าง (mm)"
                />
                <select
                  className="input !py-0.5 w-20"
                  value={col.align}
                  onChange={(e) => updateColumn(col.key, { align: e.target.value as 'left' | 'center' | 'right' })}
                >
                  <option value="left">ซ้าย</option>
                  <option value="center">กลาง</option>
                  <option value="right">ขวา</option>
                </select>
                <button type="button" className="btn-secondary !p-1" disabled={i === 0} onClick={() => moveColumn(col.key, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-secondary !p-1"
                  disabled={i === config.itemTable.columns.length - 1}
                  onClick={() => moveColumn(col.key, 1)}
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
          <Checkbox label="แสดงรูปสินค้า" checked={config.itemTable.showProductImage} onChange={(v) => updateGroup('itemTable', { showProductImage: v })} />
          <Row label="ขนาดรูปสินค้า">
            <select className="input" value={config.itemTable.productImageMode} onChange={(e) => updateGroup('itemTable', { productImageMode: e.target.value as any })}>
              <option value="NONE">ไม่แสดง</option>
              <option value="SMALL">เล็ก</option>
              <option value="MEDIUM">กลาง</option>
              <option value="FULL">เต็ม</option>
            </select>
          </Row>
          <Checkbox label="แสดงสเปก/รายละเอียด" checked={config.itemTable.showSpec} onChange={(v) => updateGroup('itemTable', { showSpec: v })} />
          <Checkbox label="เส้นขอบแนวตั้ง" checked={config.itemTable.verticalBorder} onChange={(v) => updateGroup('itemTable', { verticalBorder: v })} />
          <Checkbox label="เส้นขอบแนวนอน" checked={config.itemTable.horizontalBorder} onChange={(v) => updateGroup('itemTable', { horizontalBorder: v })} />
          <NumberField label="ระยะห่างในแถว (px)" value={config.itemTable.rowPaddingPx} onChange={(v) => updateGroup('itemTable', { rowPaddingPx: v })} />
          <NumberField label="ขนาดตัวอักษร (pt)" value={config.itemTable.fontSizePt} onChange={(v) => updateGroup('itemTable', { fontSizePt: v })} />
          <Checkbox label="แสดงหัวตารางซ้ำทุกหน้า" checked={config.itemTable.repeatHeaderEveryPage} onChange={(v) => updateGroup('itemTable', { repeatHeaderEveryPage: v })} />
        </Section>

        {/* Summary */}
        <Section title="สรุปยอด (Summary)">
          <Checkbox label="แสดงยอดรวม" checked={config.summary.showSubtotal} onChange={(v) => updateGroup('summary', { showSubtotal: v })} />
          <Checkbox label="แสดงส่วนลด" checked={config.summary.showDiscount} onChange={(v) => updateGroup('summary', { showDiscount: v })} />
          <Checkbox label="แสดง VAT" checked={config.summary.showVat} onChange={(v) => updateGroup('summary', { showVat: v })} />
          <Checkbox label="แสดงหัก ณ ที่จ่าย" checked={config.summary.showWht} onChange={(v) => updateGroup('summary', { showWht: v })} />
          <Checkbox label="แสดงยอดสุทธิ" checked={config.summary.showGrandTotal} onChange={(v) => updateGroup('summary', { showGrandTotal: v })} />
          <Checkbox label="แสดงจำนวนเงินเป็นตัวอักษร" checked={config.summary.showAmountWords} onChange={(v) => updateGroup('summary', { showAmountWords: v })} />
          <Row label="ตำแหน่ง">
            <select className="input" value={config.summary.position} onChange={(e) => updateGroup('summary', { position: e.target.value as 'left' | 'right' })}>
              <option value="right">ขวา</option>
              <option value="left">ซ้าย</option>
            </select>
          </Row>
          <NumberField label="ความกว้าง (mm)" value={config.summary.widthMm} onChange={(v) => updateGroup('summary', { widthMm: v })} />
        </Section>

        {/* Signature */}
        <Section title="ลายเซ็น (Signature)">
          <NumberField label="ความสูงพื้นที่เซ็นชื่อ (mm)" value={config.signature.heightMm} onChange={(v) => updateGroup('signature', { heightMm: v })} />
          <div className="space-y-1">
            {config.signature.boxes.map((box, i) => (
              <div key={i} className="space-y-1 rounded border border-gray-200 p-1.5 text-xs">
                <div className="flex items-center gap-1">
                  <input className="input !py-0.5 flex-1" value={box.label} onChange={(e) => updateSignatureBox(i, { label: e.target.value })} />
                  <button type="button" className="btn-secondary !p-1 text-red-600" onClick={() => removeSignatureBox(i)}>
                    ลบ
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={box.showSignatureImage} onChange={(e) => updateSignatureBox(i, { showSignatureImage: e.target.checked })} />
                    ลายเซ็นดิจิทัล
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={box.showStamp} onChange={(e) => updateSignatureBox(i, { showStamp: e.target.checked })} />
                    ตราประทับ
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={box.showDateLine} onChange={(e) => updateSignatureBox(i, { showDateLine: e.target.checked })} />
                    วันที่
                  </label>
                </div>
              </div>
            ))}
          </div>
          {config.signature.boxes.length < 4 && (
            <button type="button" className="btn-secondary text-xs" onClick={addSignatureBox}>
              + เพิ่มช่องลายเซ็น
            </button>
          )}
        </Section>
      </div>

      {/* ---------- Live Preview ---------- */}
      <div className="space-y-2">
        <div className="card flex items-center gap-3">
          <span className="label !mb-0">ทดสอบจำนวนหน้า:</span>
          {ITEM_COUNT_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`btn-secondary text-xs ${itemCount === p.value ? 'ring-2 ring-brand' : ''}`}
              onClick={() => setItemCount(p.value)}
            >
              {p.label}
            </button>
          ))}
          {pageModel && <span className="text-xs text-gray-500">รวม {pageModel.pages.length} หน้า</span>}
        </div>

        <div className="overflow-auto rounded border border-gray-300 bg-gray-100 p-4" style={{ maxHeight: '85vh' }}>
          {/* Hidden measurement pass - same components, off-screen, used to
              compute real row heights for pagination (see useClientPageModel). */}
          <div ref={measureRef} style={{ position: 'absolute', left: -99999, top: 0 }} aria-hidden>
            <DocumentRenderer data={sampleData} mode="measure" />
          </div>

          {pageModel ? (
            <div className="origin-top-left" style={{ transform: 'scale(0.75)', width: 'fit-content' }}>
              <DocumentRenderer data={sampleData} mode="paged" pageModel={pageModel} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">กำลังคำนวณตัวอย่าง...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
