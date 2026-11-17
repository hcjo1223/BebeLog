import { AwsClient } from "aws4fetch";

// ============================================================================
// OCI Object Storage (S3 호환 API) 연동 - 육아일기 사진/영상 저장
// 버킷은 비공개로 두고, 앱 서버가 권한 확인 후 프록시로 내려준다.
// ============================================================================

export {
  MAX_IMAGE_BYTES,
  MAX_MEDIA_PER_DIARY,
  MAX_VIDEO_BYTES,
  validateMediaFile,
} from "@/lib/media-rules";

interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function readConfig(): StorageConfig | null {
  const endpoint = process.env.OCI_S3_ENDPOINT;
  const bucket = process.env.OCI_S3_BUCKET;
  const accessKeyId = process.env.OCI_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OCI_S3_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  // .env.example의 자리표시자 값이 그대로 남아 있으면 미설정으로 본다
  if (endpoint.includes("<") || accessKeyId.startsWith("your-")) return null;
  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    region: process.env.OCI_S3_REGION || "us-east-1",
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

export function isStorageConfigured(): boolean {
  return readConfig() !== null;
}

function objectUrl(config: StorageConfig, key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  // OCI S3 호환 API는 path-style 주소를 사용한다
  return `${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodedKey}`;
}

function client(config: StorageConfig): AwsClient {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    service: "s3",
  });
}

export async function putObject(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  const config = readConfig();
  if (!config) throw new Error("STORAGE_NOT_CONFIGURED");
  const res = await client(config).fetch(objectUrl(config, key), {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) {
    throw new Error(`STORAGE_PUT_FAILED_${res.status}`);
  }
}

// 객체를 가져온다. 영상 탐색을 위해 Range 헤더를 그대로 전달한다
export async function getObject(key: string, range?: string | null): Promise<Response> {
  const config = readConfig();
  if (!config) throw new Error("STORAGE_NOT_CONFIGURED");
  return client(config).fetch(objectUrl(config, key), {
    method: "GET",
    headers: range ? { Range: range } : undefined,
  });
}
