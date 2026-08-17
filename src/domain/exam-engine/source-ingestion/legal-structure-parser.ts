import type { LegalNode, LegalNodeType } from "./ingestion-types";

const ARTICLE = /^\s*\uC81C(\d+)\uC870(?:\uC758\s*(\d+))?\s*\([^)\n]{1,80}\)/gm;
const PARAGRAPHS = ["\u2460","\u2461","\u2462","\u2463","\u2464","\u2465","\u2466","\u2467","\u2468","\u2469"];

export function parseLegalStructure(input: { sourceId: string; sourceVersionId: string; pages: Array<{ page: number; text: string }> }): LegalNode[] {
  const nodes: LegalNode[] = [];
  let order = 0;
  for (const page of input.pages) {
    const matches = [...page.text.matchAll(ARTICLE)];
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? page.text.length;
      const articleNumber = `${match[1]}${match[2] ? `-${match[2]}` : ""}`;
      const rawText = page.text.slice(start, end).trim();
      const article = node(input, "ARTICLE", `article-${articleNumber}`, rawText, `\uC81C${match[1]}\uC870${match[2] ? `\uC758${match[2]}` : ""}`, page.page, ++order, undefined, { articleNumber });
      nodes.push(article);
      const markers = PARAGRAPHS.map((marker) => ({ marker, index: rawText.indexOf(marker) })).filter((item) => item.index >= 0).toSorted((a,b) => a.index-b.index);
      markers.forEach((marker, paragraphIndex) => {
        const paragraphText = rawText.slice(marker.index, markers[paragraphIndex + 1]?.index ?? rawText.length).trim();
        const paragraph = node(input, "PARAGRAPH", `article-${articleNumber}-paragraph-${paragraphIndex + 1}`, paragraphText, `${article.sourceLocator}\uC81C${paragraphIndex + 1}\uD56D`, page.page, ++order, article.nodeId, { articleNumber, paragraphNumber: String(paragraphIndex + 1) });
        article.childNodeIds.push(paragraph.nodeId); nodes.push(paragraph);
        parseItems(input, paragraph, page.page, () => ++order).forEach((item) => { paragraph.childNodeIds.push(item.nodeId); nodes.push(item); });
      });
    }
  }
  return dedupeNodes(nodes);
}

function parseItems(input: {sourceId:string;sourceVersionId:string}, parent: LegalNode, page: number, nextOrder: () => number): LegalNode[] {
  const matches = [...parent.rawText.matchAll(/(?:^|\n)\s*(\d+)\.\s+/g)];
  return matches.map((match, index) => {
    const text = parent.rawText.slice(match.index ?? 0, matches[index + 1]?.index ?? parent.rawText.length).trim();
    return node(input, "ITEM", `${parent.nodeId.split(":").pop()}-item-${match[1]}`, text, `${parent.sourceLocator}\uC81C${match[1]}\uD638`, page, nextOrder(), parent.nodeId, { articleNumber: parent.articleNumber, paragraphNumber: parent.paragraphNumber, itemNumber: match[1] });
  });
}
function node(input:{sourceId:string;sourceVersionId:string}, nodeType: LegalNodeType, id:string, rawText:string, sourceLocator:string, page:number, order:number, parentNodeId?:string, extra:Partial<LegalNode>={}): LegalNode { return { nodeId:`${input.sourceId}:${input.sourceVersionId}:${id}`, sourceId:input.sourceId, sourceVersionId:input.sourceVersionId, nodeType, rawText, normalizedText:normalizeLegalText(rawText), parentNodeId, childNodeIds:[], sourceLocator, page, order, ...extra }; }
export function normalizeLegalText(text:string) { return text.replace(/\s+/g," ").replace(/\s+([,.])/g,"$1").trim(); }
function dedupeNodes(nodes:LegalNode[]) { const seen=new Set<string>(); return nodes.filter((node)=>{const key=`${node.nodeType}|${node.sourceLocator}|${node.normalizedText}`; if(seen.has(key)) return false; seen.add(key); return true;}); }
