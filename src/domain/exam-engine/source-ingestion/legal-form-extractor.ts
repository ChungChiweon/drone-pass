import type { LegalAnnex } from "./legal-annex-extractor";

export type LegalForm = LegalAnnex & { formNumber?: string; fields: string[] };

export function extractLegalForm(annex: LegalAnnex): LegalForm {
  const fields = annex.cells.map((cell) => cell.normalizedText).filter((text) => /성명|주소|등록|신청|서명|날짜|생년월일|증명/.test(text));
  return { ...annex, formNumber: /(?:별지\s*)?제?(\d+(?:의\d+)?)호/.exec(annex.title)?.[1], fields: [...new Set(fields)] };
}

