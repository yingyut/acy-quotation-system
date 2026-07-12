import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getOrCreateCompany,
  updateCompanyProfile,
  uploadCompanyAsset,
  addBankAccount,
  deleteBankAccount,
  addBranch,
  deleteBranch,
} from '@/lib/actions/company';

export default async function CompanySettingsPage() {
  await requirePermission(PERMISSIONS.COMPANY_MANAGE);
  const company = await getOrCreateCompany();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">ตั้งค่าข้อมูลบริษัท</h1>
        <p className="text-sm text-gray-500">
          ข้อมูลนี้จะแสดงบนใบเสนอราคาและเอกสารบัญชีทุกฉบับ แก้ไขได้โดยไม่ต้องแก้โค้ด
        </p>
      </div>

      <form action={updateCompanyProfile} className="card space-y-4">
        <h2 className="font-medium text-gray-800">ข้อมูลทั่วไป</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">ชื่อบริษัท (ไทย)</label>
            <input name="nameTh" defaultValue={company.nameTh} className="input" required />
          </div>
          <div>
            <label className="label">ชื่อบริษัท (อังกฤษ)</label>
            <input name="nameEn" defaultValue={company.nameEn} className="input" required />
          </div>
          <div>
            <label className="label">เลขประจำตัวผู้เสียภาษี</label>
            <input name="taxId" defaultValue={company.taxId} className="input" required />
          </div>
          <div>
            <label className="label">เบอร์โทรศัพท์</label>
            <input name="phone" defaultValue={company.phone ?? ''} className="input" />
          </div>
          <div>
            <label className="label">อีเมล</label>
            <input name="email" type="email" defaultValue={company.email ?? ''} className="input" />
          </div>
          <div>
            <label className="label">เว็บไซต์</label>
            <input name="website" defaultValue={company.website ?? ''} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">ที่อยู่สำนักงานใหญ่</label>
            <textarea name="addressTh" defaultValue={company.addressTh} className="input" rows={2} required />
          </div>
          <div>
            <label className="label">สีหลักของเอกสาร</label>
            <input
              name="primaryColor"
              type="color"
              defaultValue={company.primaryColor}
              className="h-10 w-20 rounded border border-gray-300"
            />
          </div>
        </div>

        <h2 className="pt-2 font-medium text-gray-800">เงื่อนไขและ Footer</h2>
        <div>
          <label className="label">เงื่อนไขมาตรฐาน (แสดงในใบเสนอราคา)</label>
          <textarea name="standardTerms" defaultValue={company.standardTerms ?? ''} className="input" rows={3} />
        </div>
        <div>
          <label className="label">ข้อความท้ายเอกสาร (Footer)</label>
          <textarea name="footerText" defaultValue={company.footerText ?? ''} className="input" rows={2} />
        </div>

        <button type="submit" className="btn-primary">
          บันทึกข้อมูลบริษัท
        </button>
      </form>

      <div className="card space-y-4">
        <h2 className="font-medium text-gray-800">โลโก้ / ลายเซ็น / ตราประทับ</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <AssetUploader label="Logo บริษัท" field="logoUrl" currentUrl={company.logoUrl} />
          <AssetUploader label="ตราประทับ" field="stampUrl" currentUrl={company.stampUrl} />
          <AssetUploader
            label="ลายเซ็นผู้มีอำนาจ"
            field="authorizedSignatureUrl"
            currentUrl={company.authorizedSignatureUrl}
          />
          <AssetUploader
            label="ลายเซ็นผู้จัดทำ"
            field="preparedSignatureUrl"
            currentUrl={company.preparedSignatureUrl}
          />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-medium text-gray-800">บัญชีธนาคาร</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>ธนาคาร</th>
              <th>ชื่อบัญชี</th>
              <th>เลขที่บัญชี</th>
              <th>สาขา</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {company.bankAccounts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-400">
                  ยังไม่มีบัญชีธนาคาร
                </td>
              </tr>
            )}
            {company.bankAccounts.map((b) => (
              <tr key={b.id}>
                <td>{b.bankName}</td>
                <td>{b.accountName}</td>
                <td>{b.accountNumber}</td>
                <td>{b.branchName}</td>
                <td>
                  <form action={deleteBankAccount.bind(null, b.id)}>
                    <button className="text-xs text-red-600 hover:underline">ลบ</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={addBankAccount} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input name="bankName" placeholder="ธนาคาร" className="input" required />
          <input name="accountName" placeholder="ชื่อบัญชี" className="input" required />
          <input name="accountNumber" placeholder="เลขที่บัญชี" className="input" required />
          <input name="branchName" placeholder="สาขา" className="input" />
          <button className="btn-secondary">เพิ่มบัญชี</button>
        </form>
      </div>

      <div className="card space-y-4">
        <h2 className="font-medium text-gray-800">สาขา</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อสาขา</th>
              <th>ที่อยู่</th>
              <th>สำนักงานใหญ่</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {company.branches.map((b) => (
              <tr key={b.id}>
                <td>{b.code}</td>
                <td>{b.name}</td>
                <td>{b.address}</td>
                <td>{b.isHeadOffice ? 'ใช่' : ''}</td>
                <td>
                  {!b.isHeadOffice && (
                    <form action={deleteBranch.bind(null, b.id)}>
                      <button className="text-xs text-red-600 hover:underline">ลบ</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={addBranch} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input name="code" placeholder="รหัสสาขา" className="input" required />
          <input name="name" placeholder="ชื่อสาขา" className="input" required />
          <input name="address" placeholder="ที่อยู่" className="input sm:col-span-2" />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="isHeadOffice" /> สำนักงานใหญ่
          </label>
          <button className="btn-secondary">เพิ่มสาขา</button>
        </form>
      </div>
    </div>
  );
}

function AssetUploader({
  label,
  field,
  currentUrl,
}: {
  label: string;
  field: 'logoUrl' | 'stampUrl' | 'authorizedSignatureUrl' | 'preparedSignatureUrl';
  currentUrl: string | null;
}) {
  const action = uploadCompanyAsset.bind(null, field);
  return (
    <form action={action} className="flex flex-col items-center gap-2 rounded-md border border-dashed border-gray-300 p-3">
      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded bg-gray-50">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt={label} className="max-h-16 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-gray-400">ไม่มีรูป</span>
        )}
      </div>
      <span className="text-xs text-gray-600">{label}</span>
      <input type="file" name="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="w-full text-xs" />
      <button type="submit" className="btn-secondary w-full text-xs">
        อัปโหลด
      </button>
    </form>
  );
}
