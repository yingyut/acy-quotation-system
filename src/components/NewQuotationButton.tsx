'use client';

import { useState, useTransition } from 'react';
import { createQuotation } from '@/lib/actions/quotations';

interface CustomerOption {
  id: string;
  code: string;
  name: string;
}

export function NewQuotationButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [pending, startTransition] = useTransition();

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length === 0) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/customers/search?q=${encodeURIComponent(value)}`);
    const data = await res.json();
    setResults(data);
  }

  function selectCustomer(id: string) {
    startTransition(() => {
      createQuotation(id);
    });
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-primary text-sm">
        + สร้างใบเสนอราคา
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
          <label className="label">เลือกลูกค้า</label>
          <input
            autoFocus
            className="input"
            placeholder="พิมพ์ชื่อหรือรหัสลูกค้า..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <div className="mt-2 max-h-60 overflow-y-auto">
            {pending && <p className="p-2 text-sm text-gray-500">กำลังสร้างใบเสนอราคา...</p>}
            {!pending &&
              results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c.id)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                >
                  <span className="font-medium">{c.name}</span>{' '}
                  <span className="text-xs text-gray-400">({c.code})</span>
                </button>
              ))}
            {!pending && query && results.length === 0 && (
              <p className="p-2 text-sm text-gray-400">
                ไม่พบลูกค้า —{' '}
                <a href="/customers/new" className="text-brand hover:underline">
                  เพิ่มลูกค้าใหม่
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
