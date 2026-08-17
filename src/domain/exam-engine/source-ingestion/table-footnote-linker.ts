import type { AnnexCell } from "./legal-annex-extractor";

export function linkTableFootnotes(cells: AnnexCell[], footnotes: string[]): AnnexCell[] {
  return cells.map((cell) => {
    const refs = [...cell.rawText.matchAll(/(?:주|비고)\s*(\d+)|[※*]+/g)].map((match) => match[1] ?? match[0]);
    const resolved = refs.filter((ref) => /^[※*]+$/.test(ref) ? footnotes.length > 0 : footnotes.some((note) => note.includes(ref)));
    return { ...cell, footnoteRefs: [...new Set([...cell.footnoteRefs, ...resolved])] };
  });
}
