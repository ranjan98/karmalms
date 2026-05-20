/**
 * Storage provider contract.
 *
 * The app never touches a bucket directly — it goes through `StorageProvider`.
 * The default S3 adapter has a configurable endpoint, so the same code targets
 * a company's own AWS S3, MinIO (local dev), or Cloudflare R2.
 */

export interface PutOptions {
  contentType?: string;
}

export interface StorageProvider {
  readonly name: string;

  /** Store an object and return its storage key. */
  put(key: string, body: Uint8Array | Buffer, opts?: PutOptions): Promise<string>;

  /** Fetch an object's bytes. */
  get(key: string): Promise<Uint8Array>;

  /** A time-limited URL the browser can use directly (uploads/downloads). */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  delete(key: string): Promise<void>;
}
