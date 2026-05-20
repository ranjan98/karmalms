import type { StorageProvider } from "./types";
import { s3Adapter } from "./adapters/s3";

/**
 * The active storage provider. S3-compatible is the only adapter today; the
 * interface keeps the door open for others without app-wide changes.
 */
export const storage: StorageProvider = s3Adapter;
export type { StorageProvider } from "./types";
