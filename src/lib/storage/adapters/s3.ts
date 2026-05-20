import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "@/lib/config";
import type { StorageProvider, PutOptions } from "../types";

/**
 * S3-compatible storage adapter.
 *
 * `S3_ENDPOINT` makes it portable: unset for real AWS S3, or point at MinIO /
 * Cloudflare R2. In production leave the access keys blank to use the instance
 * IAM role — the SDK picks it up automatically.
 */

const s3 = new S3Client({
  region: config.storage.region,
  endpoint: config.storage.endpoint || undefined,
  forcePathStyle: !!config.storage.endpoint, // required by MinIO
  credentials:
    config.storage.accessKeyId && config.storage.secretAccessKey
      ? {
          accessKeyId: config.storage.accessKeyId,
          secretAccessKey: config.storage.secretAccessKey,
        }
      : undefined, // fall back to the IAM role
});

const Bucket = config.storage.bucket;

export const s3Adapter: StorageProvider = {
  name: "s3",

  async put(key, body, opts?: PutOptions) {
    await s3.send(
      new PutObjectCommand({
        Bucket,
        Key: key,
        Body: body,
        ContentType: opts?.contentType,
      }),
    );
    return key;
  },

  async get(key) {
    const res = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
    return res.Body!.transformToByteArray();
  },

  async getSignedUrl(key, expiresInSeconds = 900) {
    return getSignedUrl(s3, new GetObjectCommand({ Bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  },

  async delete(key) {
    await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
  },
};
