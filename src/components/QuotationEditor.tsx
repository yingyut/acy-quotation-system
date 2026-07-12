'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveQuotation, submitQuotation, type QuotationItemInput, type SaveQuotationInput } from '@/lib/actions/quotations';
import { calcQuotationTotals, evaluateApprovalRequirement } from '@/lib/calc';
import { formatTHB } from '@/lib/money';

interface ProductOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  sellPrice: number;
  installSellPrice: number;
  costPrice: number;
  installCostPrice: number;
  imageUrl: string | null;
}

interface CustomerOption {
  id: string;
  code: string;
  name: string;
  creditTermDays: number;
  defaultDiscountPercent: number;
}

interface TemplateOption {
  id: string;
  name: string;
}

export interface QuotationEditorProps {
  quotationId: string;
  showCost: boolean;
  templates: TemplateOption[];
  approvalThresholds: { minGpPercent: number; maxDiscountPercentWithoutApproval: number };
  initial: {
    customerId: string;
    customerLabel: string;
    contactName: string;
    projectName: string;
    title: string;
    quoteDate: string;
    validUntilDays: number;
    deliveryTerms: string;
    creditTermDays: number;
    paymentTerms: string;
    templateId: string;
    vatEnabled: boolean;
    vatRate: number;
    whtEnabled: boolean;
    whtRate: number;
    billDiscountPercent: number;
    billDiscountAmount: number;
    note: string;
    items: (QuotationItemInput & { clientId: string })[];
  };
}

let uid = 0;
function nextId() {
  uid += 1;
  return `row-${uid}-${Date.now()}`;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  PRODUCT: 'สินค้า',
  SERVICE: 'บริการ',
  TEXT: 'ข้อความ',
  HEADING: 'หัวข้อหมวด',
  LUMP_SUM: 'เหมารวม',
};

export function QuotationEditor({ quotationId, showCost, templates, approvalThresholds, initial }: QuotationEditorProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [customerLabel, setCustomerLabel] = useState(initial.customerLabel);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);

  const [contactName, setContactName] = useState(initial.contactName);
  const [projectName, setProjectName] = useState(initial.projectName);
  const [title, setTitle] = useState(initial.title);
  const [quoteDate, setQuoteDate] = useState(initial.quoteDate);
  const [validUntilDays, setValidUntilDays] = useState(initial.validUntilDays);
  const [deliveryTerms, setDeliveryTerms] = useState(initial.deliveryTerms);
  const [creditTermDays, setCreditTermDays] = useState(initial.creditTermDays);
  const [paymentTerms, setPaymentTerms] = useState(initial.paymentTerms);
  const [templateId, setTemplateId] = useState(initial.templateId);
  const [vatEnabled, setVatEnabled] = useState(initial.vatEnabled);
  const [vatRate, setVatRate] = useState(initial.vatRate);
  const [whtEnabled, setWhtEnabled] = useState(initial.whtEnabled);
  const [whtRate, setWhtRate] = useState(initial.whtRate);
  const [billDiscountPercent, setBillDiscountPercent] = useState(initial.billDiscountPercent);
  const [billDiscountAmount, setBillDiscountAmount] = useState(initial.billDiscountAmount);
  const [note, setNote] = useState(initial.note);

  const [items, setItems] = useState<(QuotationItemInput & { clientId: string })[]>(
    initial.items.length > 0 ? initial.items : [],
  );
  const [productQuery, setProductQuery] = useState<Record<string, string>>({});
  const [productResults, setProductResults] = useState<Record<string, ProductOption[]>>({});
  const dragIndex = useRef<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      calcQuotationTotals({
        items: items.map((i) => ({
          itemType: i.itemType,
          qty: i.qty,
          unitPrice: i.unitPrice,
          unitCost: i.unitCost,
          discountPercent: i.discountPercent ?? 0,
          discountAmount: i.discountAmount ?? 0,
        })),
        billDiscountPercent,
        billDiscountAmount,
        vatEnabled,
        vatRate,
        whtEnabled,
        whtRate,
      }),
    [items, billDiscountPercent, billDiscountAmount, vatEnabled, vatRate, whtEnabled, whtRate],
  );

  const maxLineDiscountPercent = Math.max(0, ...items.map((i) => Number(i.discountPercent ?? 0)));
  const approval = evaluateApprovalRequirement({
    gpPercent: totals.gpPercent,
    billDiscountPercent,
    maxLineDiscountPercent,
    minGpPercent: approvalThresholds.minGpPercent,
    maxDiscountPercentWithoutApproval: approvalThresholds.maxDiscountPercentWithoutApproval,
  });

  async function searchCustomers(q: string) {
    setCustomerQuery(q);
    if (!q.trim()) return setCustomerResults([]);
    const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
    setCustomerResults(await res.json());
  }

  async function searchProducts(clientId: string, q: string) {
    setProductQuery((s) => ({ ...s, [clientId]: q }));
    if (!q.trim()) {
      setProductResults((s) => ({ ...s, [clientId]: [] }));
      return;
    }
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setProductResults((s) => ({ ...s, [clientId]: data }));
  }

  function addItem(itemType: QuotationItemInput['itemType']) {
    setItems((prev) => [
      ...prev,
      {
        clientId: nextId(),
        itemType,
        name: '',
        qty: 1,
        unit: itemType === 'PRODUCT' || itemType === 'SERVICE' ? 'ชิ้น' : '',
        unitPrice: 0,
        unitCost: 0,
        discountPercent: 0,
        discountAmount: 0,
        hideUnitPrice: itemType === 'LUMP_SUM',
      },
    ]);
  }

  function updateItem(clientId: string, patch: Partial<QuotationItemInput>) {
    setItems((prev) => prev.map((it) => (it.clientId === clientId ? { ...it, ...patch } : it)));
  }

  function removeItem(clientId: string) {
    setItems((prev) => prev.filter((it) => it.clientId !== clientId));
  }

  function duplicateItem(clientId: string) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.clientId === clientId);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], clientId: nextId() };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }

  function selectProduct(clientId: string, product: ProductOption, mode: 'PRODUCT' | 'SERVICE') {
    const unitPrice = mode === 'SERVICE' ? product.installSellPrice : product.sellPrice;
    const unitCost = mode === 'SERVICE' ? product.installCostPrice : product.costPrice;
    updateItem(clientId, {
      productId: product.id,
      code: product.code,
      name: product.name,
      unit: product.unit,
      unitPrice,
      unitCost,
      imageUrl: product.imageUrl ?? undefined,
    });
    setProductQuery((s) => ({ ...s, [clientId]: '' }));
    setProductResults((s) => ({ ...s, [clientId]: [] }));
  }

  function handleDrop(targetIdx: number) {
    const sourceIdx = dragIndex.current;
    dragIndex.current = null;
    if (sourceIdx === null || sourceIdx === targetIdx) return;
    setItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(sourceIdx, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
  }

  function buildInput(): SaveQuotationInput {
    return {
      customerId,
      contactName,
      projectName,
      title,
      quoteDate,
      validUntilDays: Number(validUntilDays),
      deliveryTerms,
      creditTermDays: Number(creditTermDays),
      paymentTerms,
      templateId: templateId || null,
      vatEnabled,
      vatRate: Number(vatRate),
      whtEnabled,
      whtRate: Number(whtRate),
      billDiscountPercent: Number(billDiscountPercent),
      billDiscountAmount: Number(billDiscountAmount),
      note,
      items: items.map(({ clientId, ...rest }) => rest),
    };
  }

  async function handleSave(submitAfter: boolean) {
    if (!customerId) {
      setMessage('กรุณาเลือกลูกค้า');
      return;
    }
    if (items.length === 0) {
      setMessage('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveQuotation(quotationId, buildInput());
      if (submitAfter) {
        await submitQuotation(quotationId);
        setMessage(
          result.requiresApproval
            ? 'บันทึกและส่งขออนุมัติแล้ว รอ Sales Manager อนุมัติ'
            : 'บันทึกและอนุมัติอัตโนมัติแล้ว (ไม่ต้องขออนุมัติ)',
        );
        router.push(`/quotations/${quotationId}`);
      } else {
        setMessage('บันทึกร่างเรียบร้อยแล้ว');
      }
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="card space-y-4">
        <h2 className="font-medium text-gray-800">ข้อมูลลูกค้าและเอกสาร</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <label className="label">ลูกค้า</label>
            <input
              className="input"
              value={customerId ? customerLabel : customerQuery}
              onChange={(e) => {
                setCustomerId('');
                searchCustomers(e.target.value);
              }}
              placeholder="พิมพ์ชื่อหรือรหัสลูกค้า"
            />
            {!customerId && customerResults.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerLabel(`${c.name} (${c.code})`);
                      setCreditTermDays(c.creditTermDays);
                      setBillDiscountPercent(Number(c.defaultDiscountPercent));
                      setCustomerResults([]);
                    }}
                  >
                    {c.name} <span className="text-xs text-gray-400">({c.code})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">ผู้ติดต่อ</label>
            <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div>
            <label className="label">โครงการ</label>
            <input className="input" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">หัวข้อใบเสนอราคา</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">วันที่</label>
            <input type="date" className="input" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
          </div>
          <div>
            <label className="label">ยืนราคา (วัน)</label>
            <input
              type="number"
              className="input"
              value={validUntilDays}
              onChange={(e) => setValidUntilDays(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">เครดิตเทอม (วัน)</label>
            <input
              type="number"
              className="input"
              value={creditTermDays}
              onChange={(e) => setCreditTermDays(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">ระยะเวลาส่งมอบ</label>
            <input className="input" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">เงื่อนไขการชำระเงิน</label>
            <input className="input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div>
            <label className="label">Template เอกสาร</label>
            <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-gray-800">รายการ</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary text-xs" onClick={() => addItem('PRODUCT')}>
              + สินค้า
            </button>
            <button className="btn-secondary text-xs" onClick={() => addItem('SERVICE')}>
              + บริการ
            </button>
            <button className="btn-secondary text-xs" onClick={() => addItem('TEXT')}>
              + ข้อความ
            </button>
            <button className="btn-secondary text-xs" onClick={() => addItem('HEADING')}>
              + หัวข้อหมวด
            </button>
            <button className="btn-secondary text-xs" onClick={() => addItem('LUMP_SUM')}>
              + เหมารวม
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีรายการ กดปุ่มด้านบนเพื่อเพิ่มรายการ</p>
          )}
          {items.map((item, idx) => (
            <div
              key={item.clientId}
              draggable
              onDragStart={() => (dragIndex.current = idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              className="rounded-md border border-gray-200 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="cursor-move text-xs font-medium text-gray-500">
                  ⠿ #{idx + 1} — {ITEM_TYPE_LABELS[item.itemType]}
                </span>
                <div className="flex gap-2 text-xs">
                  <button className="text-gray-500 hover:underline" onClick={() => duplicateItem(item.clientId)}>
                    Duplicate
                  </button>
                  <button className="text-red-600 hover:underline" onClick={() => removeItem(item.clientId)}>
                    ลบ
                  </button>
                </div>
              </div>

              {(item.itemType === 'TEXT' || item.itemType === 'HEADING') && (
                <textarea
                  className="input"
                  rows={item.itemType === 'HEADING' ? 1 : 2}
                  placeholder={item.itemType === 'HEADING' ? 'ชื่อหัวข้อหมวด เช่น งานติดตั้ง' : 'ข้อความ เช่น ค่าเดินทาง'}
                  value={item.name}
                  onChange={(e) => updateItem(item.clientId, { name: e.target.value })}
                />
              )}

              {(item.itemType === 'PRODUCT' || item.itemType === 'SERVICE') && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                  <div className="relative sm:col-span-2">
                    <input
                      className="input"
                      placeholder="ค้นหาสินค้า / พิมพ์ชื่อรายการเอง"
                      value={productQuery[item.clientId] ?? item.name}
                      onChange={(e) => {
                        updateItem(item.clientId, { name: e.target.value, productId: undefined });
                        searchProducts(item.clientId, e.target.value);
                      }}
                    />
                    {(productResults[item.clientId]?.length ?? 0) > 0 && (
                      <div className="absolute z-10 mt-1 max-h-48 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {productResults[item.clientId].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
                            onClick={() => selectProduct(item.clientId, p, item.itemType as 'PRODUCT' | 'SERVICE')}
                          >
                            {p.name} <span className="text-gray-400">({p.code})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    className="input"
                    placeholder="จำนวน"
                    value={item.qty}
                    onChange={(e) => updateItem(item.clientId, { qty: Number(e.target.value) })}
                  />
                  <input
                    className="input"
                    placeholder="หน่วย"
                    value={item.unit ?? ''}
                    onChange={(e) => updateItem(item.clientId, { unit: e.target.value })}
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="ราคา/หน่วย"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.clientId, { unitPrice: Number(e.target.value) })}
                  />
                  {showCost && (
                    <input
                      type="number"
                      className="input"
                      placeholder="ต้นทุน/หน่วย"
                      value={item.unitCost}
                      onChange={(e) => updateItem(item.clientId, { unitCost: Number(e.target.value) })}
                    />
                  )}
                  <input
                    type="number"
                    className="input"
                    placeholder="ส่วนลด %"
                    value={item.discountPercent ?? 0}
                    onChange={(e) => updateItem(item.clientId, { discountPercent: Number(e.target.value) })}
                  />
                  <textarea
                    className="input sm:col-span-6"
                    placeholder="รายละเอียดเพิ่มเติม / สเปก (แสดงในเอกสาร)"
                    rows={1}
                    value={item.description ?? ''}
                    onChange={(e) => updateItem(item.clientId, { description: e.target.value })}
                  />
                </div>
              )}

              {item.itemType === 'LUMP_SUM' && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input
                    className="input sm:col-span-2"
                    placeholder="ชื่อรายการเหมารวม"
                    value={item.name}
                    onChange={(e) => updateItem(item.clientId, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="ราคารวม"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.clientId, { unitPrice: Number(e.target.value), qty: 1 })}
                  />
                  {showCost && (
                    <input
                      type="number"
                      className="input"
                      placeholder="ต้นทุนรวม (ภายใน)"
                      value={item.unitCost}
                      onChange={(e) => updateItem(item.clientId, { unitCost: Number(e.target.value) })}
                    />
                  )}
                </div>
              )}

              {item.itemType !== 'TEXT' && item.itemType !== 'HEADING' && (
                <div className="mt-1 text-right text-xs text-gray-500">
                  รวม {formatTHB(item.qty * item.unitPrice - (item.discountAmount ?? (item.qty * item.unitPrice * (item.discountPercent ?? 0)) / 100))} บาท
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium text-gray-800">ส่วนลด / ภาษี</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">ส่วนลดท้ายบิล (%)</label>
            <input
              type="number"
              className="input"
              value={billDiscountPercent}
              onChange={(e) => setBillDiscountPercent(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">ส่วนลดท้ายบิล (บาท)</label>
            <input
              type="number"
              className="input"
              value={billDiscountAmount}
              onChange={(e) => setBillDiscountAmount(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} id="vat" />
            <label htmlFor="vat" className="text-sm">
              คิด VAT
            </label>
            <input
              type="number"
              className="input w-20"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              disabled={!vatEnabled}
            />
            %
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={whtEnabled} onChange={(e) => setWhtEnabled(e.target.checked)} id="wht" />
            <label htmlFor="wht" className="text-sm">
              หัก ณ ที่จ่าย
            </label>
            <input
              type="number"
              className="input w-20"
              value={whtRate}
              onChange={(e) => setWhtRate(Number(e.target.value))}
              disabled={!whtEnabled}
            />
            %
          </div>
        </div>
        <div>
          <label className="label">หมายเหตุ</label>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="card space-y-2 text-sm">
        <div className="flex justify-between">
          <span>ยอดรวมก่อนส่วนลด</span>
          <span>{formatTHB(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>ส่วนลดรวม</span>
          <span>{formatTHB(totals.totalDiscount)}</span>
        </div>
        <div className="flex justify-between">
          <span>มูลค่าหลังหักส่วนลด</span>
          <span>{formatTHB(totals.amountAfterDiscount)}</span>
        </div>
        {vatEnabled && (
          <div className="flex justify-between">
            <span>ภาษีมูลค่าเพิ่ม {vatRate}%</span>
            <span>{formatTHB(totals.vatAmount)}</span>
          </div>
        )}
        {whtEnabled && (
          <div className="flex justify-between">
            <span>หัก ณ ที่จ่าย {whtRate}%</span>
            <span>-{formatTHB(totals.whtAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold">
          <span>ยอดสุทธิ</span>
          <span>{formatTHB(totals.netTotal)} บาท</span>
        </div>
        {showCost && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded bg-gray-50 p-2 text-xs text-gray-600 sm:grid-cols-4">
            <div>ต้นทุนรวม: {formatTHB(totals.totalCost)}</div>
            <div>กำไร: {formatTHB(totals.totalProfit)}</div>
            <div>GP%: {totals.gpPercent.toFixed(2)}%</div>
            <div>Markup%: {totals.markupPercent.toFixed(2)}%</div>
          </div>
        )}
        {approval.requiresApproval && (
          <div className="rounded bg-amber-50 p-2 text-xs text-amber-700">
            ⚠ ต้องขออนุมัติจาก Sales Manager: {approval.reasons.join(' / ')}
          </div>
        )}
      </div>

      {message && <div className="card bg-blue-50 text-sm text-blue-700">{message}</div>}

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-3 shadow-lg md:left-64">
        <div className="mx-auto flex max-w-5xl justify-end gap-2 px-4">
          <button className="btn-secondary" disabled={saving} onClick={() => handleSave(false)}>
            บันทึกร่าง (Draft)
          </button>
          <button className="btn-primary" disabled={saving} onClick={() => handleSave(true)}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกและส่งอนุมัติ'}
          </button>
        </div>
      </div>
    </div>
  );
}
