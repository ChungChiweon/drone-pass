import { createHash } from "node:crypto";

export type LegalHtmlIngestion = { sections: Array<{ anchor?:string;text:string }>; checksum:string; hasSubstantiveLegalText:boolean };
export function ingestLegalHtml(html:string):LegalHtmlIngestion {
  const text = decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
  const articlePattern = /\uC81C\d+\uC870/g;
  const matches=[...text.matchAll(articlePattern)];
  const sections=matches.map((m,i)=>({text:text.slice(m.index??0,matches[i+1]?.index??text.length).trim()}));
  return {sections,checksum:`sha256-${createHash("sha256").update(text).digest("hex")}`,hasSubstantiveLegalText:sections.length>0};
}
function decodeEntities(value:string){return value.replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");}
