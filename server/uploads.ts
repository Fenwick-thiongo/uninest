import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max (video limit; images checked strictly at 5 MB)
  },
});

export interface DetectedFileType {
  kind: 'image' | 'video';
  ext: string;
  mime: string;
}

/**
 * Inspects binary magic bytes rather than trusting file extensions or MIME headers.
 */
export function detectMagicBytes(buf: Buffer): DetectedFileType | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { kind: 'image', ext: '.jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { kind: 'image', ext: '.png', mime: 'image/png' };
  }

  // WEBP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { kind: 'image', ext: '.webp', mime: 'image/webp' };
  }

  // MP4 / MOV: offset 4 == 'ftyp'
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (brand === 'qt  ') {
      return { kind: 'video', ext: '.mov', mime: 'video/quicktime' };
    }
    return { kind: 'video', ext: '.mp4', mime: 'video/mp4' };
  }

  // WEBM: 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { kind: 'video', ext: '.webm', mime: 'video/webm' };
  }

  return null;
}

export function saveValidatedUpload(
  buf: Buffer,
  allowedKinds: Array<'image' | 'video'>
): { url: string; kind: 'image' | 'video'; mime: string } {
  const detected = detectMagicBytes(buf);
  if (!detected || !allowedKinds.includes(detected.kind)) {
    throw new Error('Unsupported or invalid file signature. Allowed: JPEG, PNG, WEBP images or MP4, WEBM, MOV videos.');
  }

  if (detected.kind === 'image' && buf.length > 5 * 1024 * 1024) {
    throw new Error('Image files must be 5 MB or smaller.');
  }

  if (detected.kind === 'video' && buf.length > 25 * 1024 * 1024) {
    throw new Error('Video files must be 25 MB or smaller.');
  }

  const filename = `${crypto.randomUUID()}${detected.ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(fullPath, buf);

  return {
    url: `/uploads/${filename}`,
    kind: detected.kind,
    mime: detected.mime,
  };
}
