import type { OverlayBox } from "./table-overlay-validator";

export type DetectedFootnoteMarker = {
  markerId: string;
  markerText: string;
  markerType: "NOTE" | "REMARK" | "SYMBOL" | "NUMBER" | "LETTER" | "SUPERSCRIPT" | "FOOTER_NOTE";
  page: number;
  boundingBox?: OverlayBox;
  sourceCellId?: string;
  noteBlockId?: string;
  confidence: number;
};

const patterns: Array<[DetectedFootnoteMarker["markerType"], RegExp]> = [
  ["NOTE", /^(?:주|주\s*\d+)$/],
  ["REMARK", /^비고(?:\s*\d+)?$/],
  ["SYMBOL", /^(?:\*|\*\*|※|†|‡)$/],
  ["NUMBER", /^\(?\d+\)$/],
  ["LETTER", /^\(?[가-하A-Za-z]\)$/],
  ["SUPERSCRIPT", /^[¹²³⁴⁵⁶⁷⁸⁹]+$/],
];

export function detectTableFootnoteMarkers(input: Array<{
  text: string; page: number; boundingBox?: OverlayBox; sourceCellId?: string; isFooter?: boolean;
}>): DetectedFootnoteMarker[] {
  const detected: DetectedFootnoteMarker[] = [];
  input.forEach((token, index) => {
    const normalized = token.text.trim();
    const match = patterns.find(([, pattern]) => pattern.test(normalized));
    if (!match && !token.isFooter) return;
    detected.push({
      markerId: `footnote-marker:${token.page}:${index}`,
      markerText: normalized,
      markerType: token.isFooter && !match ? "FOOTER_NOTE" : (match?.[0] ?? "FOOTER_NOTE"),
      page: token.page,
      boundingBox: token.boundingBox,
      sourceCellId: token.sourceCellId,
      confidence: token.boundingBox ? 0.95 : 0.75,
    });
  });
  return detected;
}
