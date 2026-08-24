import type { HtmlPdfComparison } from "./ingestion-types";
import type { LegalHtmlIngestion } from "./legal-html-ingestor";
import type { LegalPdfIngestion } from "./legal-pdf-ingestor";

export function compareLegalRepresentations(sourceId:string,html:LegalHtmlIngestion,pdf:LegalPdfIngestion):HtmlPdfComparison[] {
  if(!html.hasSubstantiveLegalText) return [{sourceId,sourceLocator:"DOCUMENT",htmlChecksum:html.checksum,pdfChecksum:pdf.checksum,agreement:0,result:"MISSING_IN_HTML",differences:["Official HTML snapshot is a dynamic shell without article text."]}];
  const htmlText=html.sections.map((section)=>normalize(section.text)).join(" ");
  const pdfText=pdf.pages.map((page)=>normalize(page.text)).join(" ");
  const agreement=tokenAgreement(htmlText,pdfText);
  return [{sourceId,sourceLocator:"DOCUMENT",htmlChecksum:html.checksum,pdfChecksum:pdf.checksum,agreement,result:agreement>0.98?"MATCH":agreement>0.9?"MINOR_FORMAT_DIFFERENCE":"SUBSTANTIVE_DIFFERENCE",differences:agreement>0.98?[]:["Representations require human comparison."]}];
}
function normalize(value:string){return value.replace(/\s+/g,"").replace(/[\p{P}\p{S}]/gu,"");}
function tokenAgreement(a:string,b:string){if(!a.length||!b.length)return 0;const set=new Set(a.match(/.{1,8}/g)??[]);const other=new Set(b.match(/.{1,8}/g)??[]);return [...set].filter((token)=>other.has(token)).length/Math.max(set.size,other.size,1);}
