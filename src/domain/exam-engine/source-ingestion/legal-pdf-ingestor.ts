import { createHash } from "node:crypto";

export type PdfPageInput={page:number;text:string;words?:Array<{text:string;x0:number;x1:number;top:number;bottom:number}>;lines?:number};
export type LegalPdfIngestion={pages:PdfPageInput[];checksum:string;textLayerPageCount:number;coordinateSuccessPages:number;tableReferencePages:number[];mergedCellRiskPages:number[]};
export function ingestLegalPdf(pages:PdfPageInput[]):LegalPdfIngestion {
  const text=pages.map((page)=>page.text).join("\f");
  const tableReferencePages=pages.filter((page)=>/\uBCC4\uD45C|\uBCC4\uC9C0|\uC11C\uC2DD/.test(page.text)).map((page)=>page.page);
  const coordinateSuccessPages=pages.filter((page)=>(page.words?.length??0)>0).length;
  return {pages,checksum:`sha256-${createHash("sha256").update(text).digest("hex")}`,textLayerPageCount:pages.filter((page)=>page.text.trim()).length,coordinateSuccessPages,tableReferencePages,mergedCellRiskPages:tableReferencePages.filter((page)=>pages.find((item)=>item.page===page)?.lines===0)};
}
