import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Server-side S3 access. Credentials + region come from the standard AWS env
 * vars (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY); the target
 * bucket from S3_BUCKET_NAME. Used only inside Node route handlers.
 */

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({ region: process.env.AWS_REGION });
  }
  return client;
}

export function getBucket(): string {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error("Missing S3_BUCKET_NAME env var");
  return bucket;
}

/** Write a single object to the bucket. */
export async function putObject(params: {
  key: string;
  body: Uint8Array | string;
  contentType: string;
}): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
}
