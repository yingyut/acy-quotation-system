import type { Customer } from '@prisma/client';

export function CustomerForm({
  customer,
  action,
}: {
  customer?: Customer;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="card space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">รหัสลูกค้า</label>
          <input name="code" defaultValue={customer?.code} className="input" required />
        </div>
        <div>
          <label className="label">ประเภทลูกค้า</label>
          <select name="type" defaultValue={customer?.type ?? 'COMPANY'} className="input">
            <option value="COMPANY">นิติบุคคล</option>
            <option value="INDIVIDUAL">บุคคลธรรมดา</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">ชื่อลูกค้า</label>
          <input name="name" defaultValue={customer?.name} className="input" required />
        </div>
        <div>
          <label className="label">ชื่อผู้ติดต่อ</label>
          <input name="contactName" defaultValue={customer?.contactName ?? ''} className="input" />
        </div>
        <div>
          <label className="label">เลขประจำตัวผู้เสียภาษี</label>
          <input name="taxId" defaultValue={customer?.taxId ?? ''} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">ที่อยู่</label>
          <textarea name="address" defaultValue={customer?.address ?? ''} className="input" rows={2} />
        </div>
        <div>
          <label className="label">จังหวัด</label>
          <input name="province" defaultValue={customer?.province ?? ''} className="input" />
        </div>
        <div>
          <label className="label">รหัสไปรษณีย์</label>
          <input name="postalCode" defaultValue={customer?.postalCode ?? ''} className="input" />
        </div>
        <div>
          <label className="label">เบอร์โทร</label>
          <input name="phone" defaultValue={customer?.phone ?? ''} className="input" />
        </div>
        <div>
          <label className="label">อีเมล</label>
          <input name="email" type="email" defaultValue={customer?.email ?? ''} className="input" />
        </div>
        <div>
          <label className="label">Line ID</label>
          <input name="lineId" defaultValue={customer?.lineId ?? ''} className="input" />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            name="isHeadOffice"
            id="isHeadOffice"
            defaultChecked={customer?.isHeadOffice ?? true}
          />
          <label htmlFor="isHeadOffice" className="text-sm">
            เป็นสำนักงานใหญ่
          </label>
        </div>
        <div>
          <label className="label">ชื่อสาขา</label>
          <input name="branchName" defaultValue={customer?.branchName ?? ''} className="input" />
        </div>
        <div>
          <label className="label">รหัสสาขา</label>
          <input name="branchCode" defaultValue={customer?.branchCode ?? ''} className="input" />
        </div>
        <div>
          <label className="label">เครดิตเทอม (วัน)</label>
          <input
            type="number"
            name="creditTermDays"
            defaultValue={customer?.creditTermDays ?? 0}
            className="input"
            min={0}
          />
        </div>
        <div>
          <label className="label">ส่วนลดประจำลูกค้า (%)</label>
          <input
            type="number"
            step="0.01"
            name="defaultDiscountPercent"
            defaultValue={customer ? Number(customer.defaultDiscountPercent) : 0}
            className="input"
            min={0}
            max={100}
          />
        </div>
        <div>
          <label className="label">สถานะ</label>
          <select name="status" defaultValue={customer?.status ?? 'ACTIVE'} className="input">
            <option value="ACTIVE">ใช้งาน</option>
            <option value="INACTIVE">ปิดใช้งาน</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">หมายเหตุ</label>
          <textarea name="note" defaultValue={customer?.note ?? ''} className="input" rows={2} />
        </div>
      </div>
      <button type="submit" className="btn-primary">
        บันทึกข้อมูลลูกค้า
      </button>
    </form>
  );
}
