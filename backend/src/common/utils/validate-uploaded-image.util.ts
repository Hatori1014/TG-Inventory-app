import { BadRequestException } from '@nestjs/common';
// Pinned to v16 — v17+ is ESM-only and this project is CommonJS
// (tsconfig.json has no moduleResolution override to support that).
import { fromBuffer as fileTypeFromBuffer } from 'file-type';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// HU-27 — validates the file's real content, not just what the client
// claims. A client controls the declared Content-Type and the file
// extension; neither is trustworthy. `file-type` sniffs the actual magic
// bytes instead, so a malicious upload (e.g. an .html/.php file renamed to
// "product.jpg") is rejected even though its declared mimetype looks fine.
export async function validateUploadedImage(buffer: Buffer): Promise<void> {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('The uploaded file is empty');
  }
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestException('The uploaded file exceeds the 5MB limit');
  }

  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !ALLOWED_IMAGE_MIME_TYPES.includes(detected.mime)) {
    throw new BadRequestException('The uploaded file is not a valid JPG, PNG or WEBP image');
  }
}
