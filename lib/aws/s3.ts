import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

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

/** Read + parse a JSON object; returns null if the key doesn't exist. */
export async function getObjectJson<T>(key: string): Promise<T | null> {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch (err) {
    if ((err as { name?: string })?.name === "NoSuchKey") return null;
    throw err;
  }
}

/** List all object keys under a prefix (paginated). */
export async function listKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3().send(
      new ListObjectsV2Command({ Bucket: getBucket(), Prefix: prefix, ContinuationToken: token }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}
