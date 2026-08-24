import type { AttachmentType, OfficialAttachmentRecord } from "./attachment-types";

const DOWNLOAD = /flDownload\.do\?[^"'<>\s]+/gi;
const NUMBER = /(별표|별지(?:\s*제)?|서식)\s*(제?\s*\d+(?:의\d+)?호?)/;

export function parseLawAttachmentPage(
  html: string,
  input: { parentSourceId: string; parentVersionId: string; officialPageUrl: string; effectiveDate?: string },
): OfficialAttachmentRecord[] {
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const seen = new Set<string>();
  return anchors.flatMap((match, index) => {
    const attrs = match[1];
    const text = stripHtml(match[2]);
    if (!/(별표|별지|서식|부칙)/.test(text)) return [];
    const href = /href=["']([^"']+)["']/i.exec(attrs)?.[1];
    const onclick = /onclick=["']([^"']+)["']/i.exec(attrs)?.[1];
    const dynamic = DOWNLOAD.exec(`${href ?? ""} ${onclick ?? ""}`)?.[0];
    DOWNLOAD.lastIndex = 0;
    const url = dynamic ? new URL(dynamic.replace(/&amp;/g, "&"), input.officialPageUrl).toString() : undefined;
    const attachmentNumber = NUMBER.exec(text)?.[2]?.replace(/\s+/g, "");
    const key = `${text}|${url ?? onclick ?? index}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      attachmentId: `${input.parentSourceId}:attachment:${attachmentNumber ?? index + 1}`,
      parentSourceId: input.parentSourceId,
      parentVersionId: input.parentVersionId,
      title: text,
      attachmentNumber,
      attachmentType: classify(text),
      officialPageUrl: input.officialPageUrl,
      downloadUrl: url,
      fileType: inferFileType(url, text),
      versionStatus: input.effectiveDate ? "CURRENT_EFFECTIVE" : "UNKNOWN",
      effectiveDate: input.effectiveDate,
      validationStatus: url ? "DISCOVERED" : "MANUAL_ACQUISITION_REQUIRED",
      notes: url ? ["Official law.go.kr attachment endpoint discovered."] : ["Dynamic attachment requires browser resolution."],
    } satisfies OfficialAttachmentRecord];
  });
}

function stripHtml(value: string) { return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim(); }
function classify(title: string): AttachmentType { return title.includes("별지") || title.includes("서식") ? "FORM" : title.includes("부칙") ? "ADDENDUM" : "ANNEX"; }
function inferFileType(url?: string, title = ""): OfficialAttachmentRecord["fileType"] {
  const value = `${url ?? ""} ${title}`.toLowerCase();
  return value.includes("hwpx") ? "hwpx" : value.includes("hwp") || value.includes("bylclscd") ? "hwp" : value.includes("pdf") ? "pdf" : "unknown";
}

