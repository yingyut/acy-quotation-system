import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { STORAGE_ROOT } from '@/lib/storage';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const relativeSegments = params.path;
  // Reject any attempt to traverse outside the storage root.
  if (relativeSegments.some((seg) => seg === '..' || seg.includes('\\'))) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  const relativePath = relativeSegments.join('/');
  const fullPath = path.join(STORAGE_ROOT, relativePath);
  const resolvedRoot = path.resolve(STORAGE_ROOT);
  if (!path.resolve(fullPath).startsWith(resolvedRoot)) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  try {
    const data = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
