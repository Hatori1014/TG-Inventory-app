import * as sharp from 'sharp';
import { processUploadedImage } from './process-uploaded-image.util';

async function makeTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .png()
    .toBuffer();
}

describe('processUploadedImage', () => {
  it('re-encodes the image as WEBP', async () => {
    const input = await makeTestImage(400, 300);

    const result = await processUploadedImage(input);

    expect(result.contentType).toBe('image/webp');
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('webp');
  });

  it('downscales an image larger than the max dimension, preserving aspect ratio', async () => {
    const input = await makeTestImage(3200, 1600);

    const result = await processUploadedImage(input);

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
  });

  it('never upscales an image smaller than the max dimension', async () => {
    const input = await makeTestImage(200, 100);

    const result = await processUploadedImage(input);

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(100);
  });
});
