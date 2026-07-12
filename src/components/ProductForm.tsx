import type { Product } from '@prisma/client';

export function ProductForm({
  product,
  action,
  showCost,
}: {
  product?: Product;
  action: (formData: FormData) => void;
  showCost: boolean;
}) {
  return (
    <form action={action} className="card space-y-4">
      <h2 className="font-medium text-gray-800">ข้อมูลทั่วไป</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">รหัสสินค้า</label>
          <input name="code" defaultValue={product?.code} className="input" required />
        </div>
        <div>
          <label className="label">SKU</label>
          <input name="sku" defaultValue={product?.sku ?? ''} className="input" />
        </div>
        <div>
          <label className="label">Barcode</label>
          <input name="barcode" defaultValue={product?.barcode ?? ''} className="input" />
        </div>
        <div>
          <label className="label">หน่วยนับ</label>
          <input name="unit" defaultValue={product?.unit ?? 'ชิ้น'} className="input" />
        </div>
        <div>
          <label className="label">ชื่อสินค้า</label>
          <input name="name" defaultValue={product?.name} className="input" required />
        </div>
        <div>
          <label className="label">ชื่อภาษาอังกฤษ</label>
          <input name="nameEn" defaultValue={product?.nameEn ?? ''} className="input" />
        </div>
        <div>
          <label className="label">ยี่ห้อ</label>
          <input name="brand" defaultValue={product?.brand ?? ''} className="input" />
        </div>
        <div>
          <label className="label">รุ่น</label>
          <input name="model" defaultValue={product?.model ?? ''} className="input" />
        </div>
        <div>
          <label className="label">ประเทศผู้ผลิต</label>
          <input name="countryOfOrigin" defaultValue={product?.countryOfOrigin ?? ''} className="input" />
        </div>
        <div>
          <label className="label">Link เว็บไซต์ผู้ผลิต</label>
          <input name="manufacturerUrl" defaultValue={product?.manufacturerUrl ?? ''} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">รายละเอียดสินค้า</label>
          <textarea name="description" defaultValue={product?.description ?? ''} className="input" rows={3} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Technical Specification (ข้อความอิสระ)</label>
          <textarea name="techSpec" defaultValue={product?.techSpec ?? ''} className="input" rows={3} />
        </div>
        <div>
          <label className="label">Warranty</label>
          <input name="warrantyText" defaultValue={product?.warrantyText ?? ''} className="input" />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" name="isActive" id="isActive" defaultChecked={product?.isActive ?? true} />
          <label htmlFor="isActive" className="text-sm">
            เปิดใช้งาน
          </label>
        </div>
      </div>

      <h2 className="pt-2 font-medium text-gray-800">ราคาขาย</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label">ราคาขายสินค้า</label>
          <input type="number" step="0.01" name="sellPrice" defaultValue={product ? Number(product.sellPrice) : 0} className="input" />
        </div>
        <div>
          <label className="label">ราคาขายติดตั้ง</label>
          <input
            type="number"
            step="0.01"
            name="installSellPrice"
            defaultValue={product ? Number(product.installSellPrice) : 0}
            className="input"
          />
        </div>
        <div>
          <label className="label">ราคาขายมาตรฐาน</label>
          <input
            type="number"
            step="0.01"
            name="standardSellPrice"
            defaultValue={product ? Number(product.standardSellPrice) : 0}
            className="input"
          />
        </div>
      </div>

      {showCost && (
        <>
          <h2 className="pt-2 font-medium text-gray-800">ต้นทุน (มองเห็นเฉพาะผู้มีสิทธิ์)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">ราคาทุนสินค้า</label>
              <input type="number" step="0.01" name="costPrice" defaultValue={product ? Number(product.costPrice) : 0} className="input" />
            </div>
            <div>
              <label className="label">ราคาทุนติดตั้ง</label>
              <input
                type="number"
                step="0.01"
                name="installCostPrice"
                defaultValue={product ? Number(product.installCostPrice) : 0}
                className="input"
              />
            </div>
            <div>
              <label className="label">ค่าแรง</label>
              <input type="number" step="0.01" name="laborCost" defaultValue={product ? Number(product.laborCost) : 0} className="input" />
            </div>
            <div>
              <label className="label">ค่าขนส่ง</label>
              <input
                type="number"
                step="0.01"
                name="shippingCost"
                defaultValue={product ? Number(product.shippingCost) : 0}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">หมายเหตุภายใน</label>
            <textarea name="internalNote" defaultValue={product?.internalNote ?? ''} className="input" rows={2} />
          </div>
        </>
      )}

      <button type="submit" className="btn-primary">
        บันทึกข้อมูลสินค้า
      </button>
    </form>
  );
}
