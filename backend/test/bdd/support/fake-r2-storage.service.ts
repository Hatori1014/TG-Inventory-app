export interface FakeStoredObject {
  body: Buffer;
  contentType: string;
}

// In-memory stand-in for R2StorageService — BDD tests never touch a real
// Cloudflare R2 bucket. Tracks deleted keys so a scenario can assert that
// replacing an image really deleted the previous object.
export class FakeR2StorageService {
  private readonly objects = new Map<string, FakeStoredObject>();
  public readonly deletedKeys: string[] = [];

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType });
  }

  async get(key: string): Promise<FakeStoredObject> {
    const found = this.objects.get(key);
    if (!found) {
      throw new Error(`Object ${key} not found`);
    }
    return found;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
    this.deletedKeys.push(key);
  }

  has(key: string): boolean {
    return this.objects.has(key);
  }
}
