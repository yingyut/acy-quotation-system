import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export const STORAGE_ROOT = process.env.STORAGE_PATH ?? './storage';
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 15) * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

export class UploadValidationError extends Error {}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
  };
  return map[mime] ?? 'bin';
}

export interface SavedFile {
  relativePath: string; // stored in DB, e.g. "uploads/products/xxxx.jpg"
  url: string; // served via /api/files/<relativePath>
  size: number;
}

async function saveBuffer(
  buffer: Buffer,
  mimeType: string,
  subDir: string,
  allowedTypes: string[],
): Promise<SavedFile> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      `ไฟล์มีขนาดเกิน ${process.env.MAX_UPLOAD_SIZE_MB ?? 15}MB ที่กำหนดไว้`,
    );
  }
  if (!allowedTypes.includes(mimeType)) {
    throw new UploadValidationError(`ไม่รองรับไฟล์ประเภทนี้ (${mimeType})`);
  }

  const dir = path.join(STORAGE_ROOT, 'uploads', subDir);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.${extFromMime(mimeType)}`;
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, buffer);

  const relativePath = `uploads/${subDir}/${fileName}`;
  return { relativePath, url: `/api/files/${relativePath}`, size: buffer.byteLength };
}

export async function saveImage(file: File, subDir: string): Promise<SavedFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveBuffer(buffer, file.type, subDir, ALLOWED_IMAGE_TYPES);
}

export async function saveDocument(file: File, subDir: string): Promise<SavedFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveBuffer(buffer, file.type, subDir, [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]);
}

export async function deleteStoredFile(relativePath: string): Promise<void> {
  try {
    await fs.unlink(path.join(STORAGE_ROOT, relativePath));
  } catch {
    // Already gone - ignore.
  }
}

/** Reads a stored image and returns it as a base64 data: URI, used to embed
 *  logos/signatures/product photos directly into server-rendered print
 *  templates (avoids an extra authenticated network hop for Puppeteer). */
export async function fileToDataUri(relativePathOrUrl: string | null | undefined): Promise<string | null> {
  if (!relativePathOrUrl) return null;
  const relativePath = relativePathOrUrl.replace(/^\/api\/files\//, '');
  const fullPath = path.join(STORAGE_ROOT, relativePath);
  try {
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).slice(1).toLowerCase();
    const mime =
      ext === 'svg'
        ? 'image/svg+xml'
        : ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export function resolveStoragePath(relativePath: string): string {
  return path.join(STORAGE_ROOT, relativePath);
}
