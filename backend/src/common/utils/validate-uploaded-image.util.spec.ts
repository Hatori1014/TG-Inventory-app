import { BadRequestException } from '@nestjs/common';
import { MAX_IMAGE_SIZE_BYTES, validateUploadedImage } from './validate-uploaded-image.util';

// Minimal real magic-number headers — enough for file-type to identify the
// format without needing a full, valid image file as a fixture.
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const PNG_HEADER = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]),
  Buffer.alloc(32),
]);
const WEBP_HEADER = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 ', 'ascii'),
]);

describe('validateUploadedImage', () => {
  it('accepts a buffer whose real bytes are a JPEG, regardless of what it is later used as', async () => {
    await expect(validateUploadedImage(JPEG_HEADER)).resolves.toBeUndefined();
  });

  it('accepts a real PNG buffer', async () => {
    await expect(validateUploadedImage(PNG_HEADER)).resolves.toBeUndefined();
  });

  it('accepts a real WEBP buffer', async () => {
    await expect(validateUploadedImage(WEBP_HEADER)).resolves.toBeUndefined();
  });

  it('rejects an empty buffer', async () => {
    await expect(validateUploadedImage(Buffer.alloc(0))).rejects.toThrow(BadRequestException);
  });

  it('rejects a buffer larger than 5MB', async () => {
    const oversized = Buffer.concat([JPEG_HEADER, Buffer.alloc(MAX_IMAGE_SIZE_BYTES)]);
    await expect(validateUploadedImage(oversized)).rejects.toThrow(BadRequestException);
  });

  // The whole point of HU-27: a file whose *content* isn't an image at all
  // must be rejected even if a client claimed it was — the sniff happens
  // on the real bytes, this test never even sets a declared mimetype.
  it('rejects a file whose real bytes are not an image (e.g. a script disguised as a photo)', async () => {
    const disguisedScript = Buffer.from('<script>alert(document.cookie)</script>', 'utf-8');
    await expect(validateUploadedImage(disguisedScript)).rejects.toThrow(BadRequestException);
  });

  it('rejects a real file of a disallowed type (e.g. a PDF)', async () => {
    const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n', 'utf-8');
    await expect(validateUploadedImage(pdfHeader)).rejects.toThrow(BadRequestException);
  });
});
