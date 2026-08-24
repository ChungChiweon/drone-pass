import type { OfficialSourceAttachment } from "./source-acquisition-types";

export function resolveLawAttachments(parentSourceId: string, html: string): OfficialSourceAttachment[] {
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set<string>();
  return links.flatMap((match, index) => {
    const title = stripHtml(match[2]);
    if (!/(별표|별지|서식|부칙|개정이유)/.test(title)) return [];
    const officialUrl = new URL(match[1], "https://www.law.go.kr").toString();
    const key = `${title}|${officialUrl}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const fileName = decodeURIComponent(new URL(officialUrl).pathname.split("/").pop() || `attachment-${index + 1}`);
    return [{ attachmentId: `${parentSourceId}:attachment:${index + 1}`, parentSourceId, title, attachmentType: title.includes("서식") ? "FORM" : title.includes("부칙") ? "ADDENDUM" : title.includes("개정이유") ? "AMENDMENT_REASON" : "APPENDIX", fileName, fileType: fileName.split(".").pop()?.toLowerCase() ?? "html", officialUrl, localPath: null, extractionStatus: "MANUAL_ACQUISITION_REQUIRED" } satisfies OfficialSourceAttachment];
  });
}
function stripHtml(value: string) { return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
