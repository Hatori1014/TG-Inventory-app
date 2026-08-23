import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

// HU-26/27, first real consumer of Cloudflare R2 (TT-06 provisioned it,
// nothing ever read/wrote to it until now). R2 is S3-compatible, so the
// AWS SDK's S3Client talks to it directly against R2's own endpoint —
// no separate Cloudflare SDK needed. Bucket stays private (convenciones.md:
// user uploads never get written to this app's own disk, and per the
// user's explicit choice, images aren't served via a public R2 URL either
// — the backend proxies them, see GetProductImageUseCase).
@Injectable()
export class R2StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    this.bucket = this.config.get<string>('R2_BUCKET_NAME')!;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('R2_SECRET_ACCESS_KEY')!,
      },
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<StoredObject> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const chunks: Buffer[] = [];
    for await (const chunk of result.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    return { body: Buffer.concat(chunks), contentType: result.ContentType ?? 'application/octet-stream' };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
