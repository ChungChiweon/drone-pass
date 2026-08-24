import { createHash } from "node:crypto";
import type { DownloadValidationInput, DownloadValidationResult } from "./source-acquisition-types";

const ERROR_MARKERS = ["error", "요청하신 페이지", "접근이 제한", "페이지를 찾을 수"];

export function validateSourceDownload(input: DownloadValidationInput): DownloadValidationResult {
  const warnings: string[] = [];
  if (input.httpStatus < 200 || input.httpStatus >= 300 || input.bytes.length === 0) return result(false, "DOWNLOAD_FAILED", "unknown", input, warnings);
  const detectedMime = detectMime(input.bytes);
  const prefix = new TextDecoder("utf-8", { fatal: false }).decode(input.bytes.slice(0, 4_096)).toLowerCase();
  if (detectedMime === "text/html" && ERROR_MARKERS.some((marker) => prefix.includes(marker.toLowerCase()))) return result(false, "HTML_ERROR_PAGE", detectedMime, input, warnings);
  const expected = extensionMime(input.fileName);
  if (expected && detectedMime !== expected) return result(false, "MIME_MISMATCH", detectedMime, input, warnings);
  const checksum = input.checksum ?? `sha256-${createHash("sha256").update(input.bytes).digest("hex")}`;
  if (input.knownChecksums?.has(checksum)) return { ...result(false, "DUPLICATE_FILE", detectedMime, input, warnings), checksum };
  if (input.attachmentRequired && input.bytes.length === 0) return result(false, "ATTACHMENT_MISSING", detectedMime, input, warnings);
  return { valid: true, status: "READY", detectedMime, checksum, contentLength: input.bytes.length, warnings };
}

function detectMime(bytes: Uint8Array) {
  const head = Array.from(bytes.slice(0, 8));
  if (String.fromCharCode(...head.slice(0, 4)) === "%PDF") return "application/pdf";
  if (head[0] === 0x50 && head[1] === 0x4b) return "application/zip";
  const text = new TextDecoder().decode(bytes.slice(0, 64)).trimStart().toLowerCase();
  if (text.startsWith("<!doctype html") || text.startsWith("<html")) return "text/html";
  return "application/octet-stream";
}
function extensionMime(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".hwpx") || lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  return undefined;
}
function result(valid: boolean, status: DownloadValidationResult["status"], detectedMime: string, input: DownloadValidationInput, warnings: string[]): DownloadValidationResult {
  return { valid, status, detectedMime, checksum: input.checksum, contentLength: input.bytes.length, warnings };
}
