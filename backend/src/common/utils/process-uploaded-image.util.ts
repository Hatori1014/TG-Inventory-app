// sharp is a plain CommonJS module (`module.exports = Sharp`) — a default
// import misbehaves under this project's TS interop settings (no
// esModuleInterop), so this uses a namespace import instead, which for a
// module without its own `.default` just is `module.exports` directly.
import * as sharp from 'sharp';

const MAX_DIMENSION_PX = 1600;
const WEBP_QUALITY = 80;

export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
}

// HU-26, at the user's explicit request: every uploaded image is resized
// (capped at MAX_DIMENSION_PX on its longest side, aspect ratio preserved,
// never upscaled) and re-encoded as WEBP before it ever reaches R2 —
// smaller files regardless of the format that was uploaded (jpg/png/webp,
// enforced separately by validateUploadedImage), one consistent format to
// serve back out.
export async function processUploadedImage(buffer: Buffer): Promise<ProcessedImage> {
  const processed = await sharp(buffer)
    .resize({ width: MAX_DIMENSION_PX, height: MAX_DIMENSION_PX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer: processed, contentType: 'image/webp' };
}
