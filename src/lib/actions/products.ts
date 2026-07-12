'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { saveImage, saveDocument, deleteStoredFile } from '@/lib/storage';

const productSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสสินค้า'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1, 'กรุณากรอกชื่อสินค้า'),
  nameEn: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  unit: z.string().default('ชิ้น'),
  description: z.string().optional(),
  techSpec: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  manufacturerUrl: z.string().optional(),
  costPrice: z.coerce.number().min(0).default(0),
  installCostPrice: z.coerce.number().min(0).default(0),
  sellPrice: z.coerce.number().min(0).default(0),
  installSellPrice: z.coerce.number().min(0).default(0),
  standardSellPrice: z.coerce.number().min(0).default(0),
  laborCost: z.coerce.number().min(0).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  warrantyText: z.string().optional(),
  internalNote: z.string().optional(),
  isActive: z.boolean().default(true),
});

function parseProductForm(formData: FormData) {
  return productSchema.parse({
    code: formData.get('code'),
    sku: formData.get('sku') || undefined,
    barcode: formData.get('barcode') || undefined,
    name: formData.get('name'),
    nameEn: formData.get('nameEn') || undefined,
    brand: formData.get('brand') || undefined,
    model: formData.get('model') || undefined,
    unit: formData.get('unit') || 'ชิ้น',
    description: formData.get('description') || undefined,
    techSpec: formData.get('techSpec') || undefined,
    countryOfOrigin: formData.get('countryOfOrigin') || undefined,
    manufacturerUrl: formData.get('manufacturerUrl') || undefined,
    costPrice: formData.get('costPrice') || 0,
    installCostPrice: formData.get('installCostPrice') || 0,
    sellPrice: formData.get('sellPrice') || 0,
    installSellPrice: formData.get('installSellPrice') || 0,
    standardSellPrice: formData.get('standardSellPrice') || 0,
    laborCost: formData.get('laborCost') || 0,
    shippingCost: formData.get('shippingCost') || 0,
    warrantyText: formData.get('warrantyText') || undefined,
    internalNote: formData.get('internalNote') || undefined,
    isActive: formData.get('isActive') === 'on',
  });
}

const PRICE_FIELDS = ['costPrice', 'installCostPrice', 'sellPrice', 'installSellPrice', 'standardSellPrice'] as const;

export async function createProduct(formData: FormData) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  const data = parseProductForm(formData);

  const created = await prisma.product.create({ data });
  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'Product', entityId: created.id, newValue: created });
  revalidatePath('/products');
  redirect(`/products/${created.id}`);
}

export async function updateProduct(id: string, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  const data = parseProductForm(formData);
  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.product.update({ where: { id }, data });

  const priceChanges = PRICE_FIELDS.filter(
    (f) => Number(existing[f]) !== Number(updated[f]),
  );
  if (priceChanges.length > 0) {
    await prisma.productPriceHistory.createMany({
      data: priceChanges.map((f) => ({
        productId: id,
        field: f,
        oldValue: String(existing[f]),
        newValue: String(updated[f]),
        changedBy: user.username,
      })),
    });
  }

  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'Product', entityId: id, oldValue: existing, newValue: updated });
  revalidatePath('/products');
  revalidatePath(`/products/${id}`);
}

export async function deactivateProduct(id: string) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.product.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'Product', entityId: id, oldValue: existing, newValue: updated });
  revalidatePath('/products');
}

export async function duplicateProduct(id: string) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  const original = await prisma.product.findUniqueOrThrow({ where: { id }, include: { specs: true } });

  const created = await prisma.product.create({
    data: {
      code: `${original.code}-COPY`,
      sku: original.sku,
      barcode: original.barcode,
      name: `${original.name} (สำเนา)`,
      nameEn: original.nameEn,
      brand: original.brand,
      model: original.model,
      categoryId: original.categoryId,
      unit: original.unit,
      description: original.description,
      techSpec: original.techSpec,
      countryOfOrigin: original.countryOfOrigin,
      manufacturerUrl: original.manufacturerUrl,
      supplierId: original.supplierId,
      costPrice: original.costPrice,
      installCostPrice: original.installCostPrice,
      sellPrice: original.sellPrice,
      installSellPrice: original.installSellPrice,
      standardSellPrice: original.standardSellPrice,
      laborCost: original.laborCost,
      shippingCost: original.shippingCost,
      warrantyText: original.warrantyText,
      internalNote: original.internalNote,
      isActive: original.isActive,
      specs: { create: original.specs.map((s) => ({ label: s.label, value: s.value, sortOrder: s.sortOrder })) },
    },
  });

  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'Product', entityId: created.id, newValue: created });
  revalidatePath('/products');
  redirect(`/products/${created.id}`);
}

export async function addProductImage(productId: string, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error('กรุณาเลือกไฟล์รูปภาพ');

  const saved = await saveImage(file, 'products');
  const isFirst = (await prisma.productImage.count({ where: { productId } })) === 0;
  const created = await prisma.productImage.create({
    data: { productId, url: saved.url, isPrimary: isFirst },
  });

  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'ProductImage', entityId: created.id, newValue: created });
  revalidatePath(`/products/${productId}`);
}

export async function deleteProductImage(productId: string, id: string) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  const existing = await prisma.productImage.delete({ where: { id } });
  await deleteStoredFile(existing.url.replace(/^\/api\/files\//, ''));
  await writeAuditLog({ userId: user.id, action: 'DELETE', entityType: 'ProductImage', entityId: id, oldValue: existing });
  revalidatePath(`/products/${productId}`);
}

export async function setPrimaryProductImage(productId: string, id: string) {
  await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    prisma.productImage.update({ where: { id }, data: { isPrimary: true } }),
  ]);
  revalidatePath(`/products/${productId}`);
}

export async function addProductSpec(productId: string, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  const label = String(formData.get('label') ?? '').trim();
  const value = String(formData.get('value') ?? '').trim();
  if (!label || !value) throw new Error('กรุณากรอก Spec ให้ครบ');

  const count = await prisma.productSpec.count({ where: { productId } });
  const created = await prisma.productSpec.create({ data: { productId, label, value, sortOrder: count } });
  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'ProductSpec', entityId: created.id, newValue: created });
  revalidatePath(`/products/${productId}`);
}

export async function deleteProductSpec(productId: string, id: string) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  const existing = await prisma.productSpec.delete({ where: { id } });
  await writeAuditLog({ userId: user.id, action: 'DELETE', entityType: 'ProductSpec', entityId: id, oldValue: existing });
  revalidatePath(`/products/${productId}`);
}

export async function uploadProductDatasheet(productId: string, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_MANAGE);
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error('กรุณาเลือกไฟล์ Datasheet (PDF)');

  const saved = await saveDocument(file, 'datasheets');
  await prisma.attachment.create({
    data: {
      entityType: 'Product',
      entityId: productId,
      fileName: file.name,
      filePath: saved.relativePath,
      fileSize: saved.size,
      mimeType: file.type,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/products/${productId}`);
}
