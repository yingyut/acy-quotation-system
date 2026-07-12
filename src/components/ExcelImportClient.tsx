'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RowWithErrors {
  row: number;
  errors: string[];
  [key: string]: unknown;
}

export function ExcelImportClient({
  importUrl,
  listUrl,
  displayColumns,
}: {
  importUrl: string;
  listUrl: string;
  displayColumns: { key: string; label: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RowWithErrors[] | null>(null);
  const [validCount, setValidCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${importUrl}?mode=preview`, { method: 'POST', body: formData });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setResult(data.error ?? 'เกิดข้อผิดพลาดในการอ่านไฟล์');
      return;
    }
    setRows(data.rows);
    setValidCount(data.validRows);
  }

  async function handleConfirm() {
    if (!rows) return;
    setLoading(true);
    const res = await fetch(`${importUrl}?mode=commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setResult(data.error ?? 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
      return;
    }
    setResult(`นำเข้าสำเร็จ ${data.imported} รายการ`);
    setRows(null);
    setFileInputKey((k) => k + 1);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <label className="label">เลือกไฟล์ Excel (.xlsx) ที่ได้จาก Template</label>
        <input
          key={fileInputKey}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="text-sm"
        />
        {loading && <p className="text-sm text-gray-500">กำลังประมวลผล...</p>}
        {result && <p className="text-sm font-medium text-brand">{result}</p>}
      </div>

      {rows && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              พบ {rows.length} แถว — ถูกต้อง {validCount} แถว, มีปัญหา {rows.length - validCount} แถว
            </p>
            <button
              onClick={handleConfirm}
              disabled={validCount === 0 || loading}
              className="btn-primary text-sm"
            >
              ยืนยันนำเข้า {validCount} รายการ
            </button>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>แถว</th>
                  {displayColumns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th>ปัญหา</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className={r.errors.length ? 'bg-red-50' : ''}>
                    <td>{r.row}</td>
                    {displayColumns.map((c) => (
                      <td key={c.key}>{String(r[c.key] ?? '')}</td>
                    ))}
                    <td className="text-red-600">{r.errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <a href={listUrl} className="btn-secondary inline-block text-sm">
        กลับไปหน้ารายการ
      </a>
    </div>
  );
}
