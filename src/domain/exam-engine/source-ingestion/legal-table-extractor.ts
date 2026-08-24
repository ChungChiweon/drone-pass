import type { PdfPageInput } from "./legal-pdf-ingestor";
import type { TableRecord } from "./ingestion-types";

export function extractLegalTables(sourceId:string,pages:readonly PdfPageInput[]):{tables:TableRecord[];detected:number;warnings:string[]} {
  const candidates=pages.filter((page)=>/\uBCC4\uD45C|\uBCC4\uC9C0|\uAE30\uC900\uD45C|\uCC98\uBD84\uAE30\uC900/.test(page.text));
  const tables:TableRecord[]=[];
  const warnings:string[]=[];
  for(const page of candidates){
    const words=page.words??[];
    const rows=groupRows(words);
    if((page.lines??0)<2 || rows.length<2){warnings.push(`TABLE_REFERENCE_NOT_EXTRACTED:PDF p.${page.page}`);continue;}
    tables.push({tableId:`TABLE-${sourceId}-${page.page}`,sourceId,sourceLocator:`PDF p.${page.page}`,pageRange:[page.page],title:rows[0].join(" ").slice(0,160),headers:rows[0],rows:rows.slice(1),mergedCells:[],footnotes:[],rowGroups:[],columnGroups:[],extractionConfidence:0.65,visualVerificationRequired:true});
  }
  return {tables,detected:candidates.length,warnings};
}
function groupRows(words:NonNullable<PdfPageInput["words"]>){const buckets=new Map<number,typeof words>();for(const word of words){const key=Math.round(word.top/4)*4;buckets.set(key,[...(buckets.get(key)??[]),word]);}return [...buckets.entries()].toSorted((a,b)=>a[0]-b[0]).map(([,items])=>items.toSorted((a,b)=>a.x0-b.x0).map((item)=>item.text)).filter((row)=>row.length>1);}
