import "server-only";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "blacksmith-runtime")
  : path.join(process.cwd(), "data", "runtime");

const BLOB_PREFIX = "blacksmith-runtime";

export function hasBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.VERCEL);
}

export function runtimeRoot() {
  return DATA_DIR;
}

export function safeUploadName(filename: string) {
  const base = path.basename(filename);
  if (!base || base !== filename.replace(/\\/g, "/").split("/").pop()) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return base;
}

function blobKey(rel: string) {
  return `${BLOB_PREFIX}/${rel.replace(/^\/+/, "")}`;
}

function diskPath(rel: string) {
  return path.join(DATA_DIR, rel.replace(/\\/g, "/"));
}

function contentTypeFor(rel: string) {
  const ext = rel.split(".").pop()?.toLowerCase();
  if (ext === "json") return "application/json; charset=utf-8";
  if (ext === "png") return "image/png";
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function streamToBuffer(body: ReadableStream | Blob | ArrayBuffer | Buffer | Uint8Array) {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  return Buffer.from(await new Response(body as ReadableStream).arrayBuffer());
}

async function blobRead(rel: string): Promise<Buffer | null> {
  const { get } = await import("@vercel/blob");
  const result = await get(blobKey(rel), {
    access: "private",
    ...(rel === "db.json" ? { useCache: false as const } : {}),
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return streamToBuffer(result.stream);
}

async function blobWrite(rel: string, buf: Buffer) {
  const { put } = await import("@vercel/blob");
  await put(blobKey(rel), buf, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: contentTypeFor(rel),
    cacheControlMaxAge: rel === "db.json" ? 60 : 60 * 60,
  });
}

export async function readRuntimeBytes(rel: string): Promise<Buffer | null> {
  if (hasBlobStore()) {
    return blobRead(rel);
  }
  try {
    return await fs.readFile(diskPath(rel));
  } catch {
    return null;
  }
}

export async function writeRuntimeBytes(rel: string, buf: Buffer) {
  if (hasBlobStore()) {
    await blobWrite(rel, buf);
    return;
  }
  const full = diskPath(rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
}

export async function readRuntimeText(rel: string) {
  const buf = await readRuntimeBytes(rel);
  return buf ? buf.toString("utf8") : null;
}

export async function writeRuntimeText(rel: string, text: string) {
  await writeRuntimeBytes(rel, Buffer.from(text, "utf8"));
}
