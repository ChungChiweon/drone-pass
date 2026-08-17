import type { EncodingQuality, ExtractionWarning, PdfPageText } from "./pdf-extraction-quality";
import { hasLikelyMojibake } from "./pdf-text-normalizer";

export function detectEncodingQuality(pages: Pick<PdfPageText, "pageNumber" | "text">[]): EncodingQuality {
  const text = pages.map((page) => page.text).join("\n");
  const replacementCharacters = countMatches(text, /\uFFFD/g);
  const abnormalUnicodeCount = countMatches(text, /[\uE000-\uF8FF]/g);
  const mojibakeHits = countMatches(text, /\?{3,}|[ÃÂ][\x80-\xBF]|[媛揶횄횂][^\s]{1,8}/g);
  const corruptedCharacters = replacementCharacters + abnormalUnicodeCount + mojibakeHits;
  const affectedPages = pages.filter((page) => hasLikelyMojibake(page.text)).map((page) => page.pageNumber);
  const ratio = text.length ? corruptedCharacters / text.length : 1;
  return {
    score: round(Math.max(0, 1 - (ratio * 12) - (affectedPages.length * 0.03))),
    corruptedCharacters,
    affectedPages,
    replacementCharacters,
    abnormalUnicodeCount
  };
}

export function encodingWarnings(quality: EncodingQuality): ExtractionWarning[] {
  if (quality.score >= 0.85) return [];
  return [{
    type: "ENCODING_ERROR",
    severity: quality.score < 0.6 ? "HIGH" : "MEDIUM",
    message: `PDF text contains likely encoding/OCR corruption on ${quality.affectedPages.length} page(s).`
  }];
}

function countMatches(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].length;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
