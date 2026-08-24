import type { LegalFactCandidate, LegalFactType, LegalNode, LegalOperator, NumericValue } from "./ingestion-types";

const UNITS = "kg|g|km|m|ft|\uC2DC\uAC04|\uBD84|\uC77C|\uAC1C\uC6D4|\uB144|\uC138|\uC6D0|%|\uB300|\uD68C";
const NUMERIC = new RegExp(`(\\d+(?:[,.]\\d+)?)\\s*(${UNITS})\\s*(\\uC774\\uC0C1|\\uC774\\uD558|\\uCD08\\uACFC|\\uBBF8\\uB9CC|\\uC774\\uB0B4|\\uC804|\\uC774\\uD6C4)?`, "g");

export function buildLegalFactCandidates(nodes: readonly LegalNode[], metadata: { authority:string; effectiveDate:string }): LegalFactCandidate[] {
  const leaves = nodes.filter((node) => (node.nodeType === "ITEM" || node.nodeType === "PARAGRAPH" || (node.nodeType === "ARTICLE" && node.childNodeIds.length === 0)) && node.normalizedText.length >= 20);
  const seen = new Set<string>();
  return leaves.flatMap((node, index) => {
    const key = `${node.sourceId}|${node.sourceLocator}|${node.normalizedText}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const numbers = extractNumericValues(node.normalizedText);
    const conditions = extractSentences(node.normalizedText, ["\uACBD\uC6B0", "\uB54C\uC5D0", "\uB530\uB77C", "\uD574\uB2F9\uD558\uB294"]);
    const exceptions = extractSentences(node.normalizedText, ["\uB2E4\uB9CC", "\uC81C\uC678", "\uC608\uC678"]);
    const citations = [...node.normalizedText.matchAll(/(?:\uBC95|\uC601|\uADDC\uCE59)?\s*\uC81C\d+\uC870(?:\uC758\d+)?(?:\uC81C\d+\uD56D)?(?:\uC81C\d+\uD638)?/g)].map((match)=>match[0].replace(/\s+/g,""));
    const first = numbers[0];
    const blockers = ["SOURCE_INGESTION_UNVALIDATED", ...(exceptions.length && node.nodeType === "ARTICLE" ? ["EXCEPTION_SCOPE_AMBIGUOUS"] : [])];
    return [{ candidateId:`LFC-${node.sourceId}-${String(index+1).padStart(5,"0")}`, sourceId:node.sourceId, sourceVersionId:node.sourceVersionId, sourceAuthority:metadata.authority, sourceLocator:`${node.sourceLocator}; PDF p.${node.page}`, subject:inferSubject(node.normalizedText), predicate:inferPredicate(node.normalizedText), object:node.normalizedText, value:first?.value, unit:first?.unit, operator:first?.operator ?? "NONE", conditions, exceptions, applicability:conditions, effectiveDate:metadata.effectiveDate, citedArticles:citations, factType:inferFactType(node.normalizedText, numbers), groupId:node.nodeId, groupOperator:inferGroupOperator(node.normalizedText), standaloneQuestionAllowed:blockers.length===0 && node.nodeType!=="ARTICLE", rawEvidenceText:node.rawText, normalizedStatement:node.normalizedText, extractionConfidence:0.78, legalStructureConfidence:node.nodeType === "ITEM" ? 0.9 : 0.82, tableStructureConfidence:0, currentnessStatus:"CURRENT_EFFECTIVE", warnings:numbers.length>1?["MULTIPLE_NUMERIC_VALUES_PRESERVED"]:[], blockers } satisfies LegalFactCandidate];
  });
}

export function extractNumericValues(text:string): NumericValue[] { return [...text.matchAll(NUMERIC)].map((m)=>({raw:m[0],value:Number(m[1].replace(/,/g,"")),unit:m[2],operator:operator(m[3])})); }
function operator(value?:string):LegalOperator { return ({"\uC774\uC0C1":"GTE","\uC774\uD558":"LTE","\uCD08\uACFC":"GT","\uBBF8\uB9CC":"LT","\uC774\uB0B4":"WITHIN","\uC804":"BEFORE","\uC774\uD6C4":"AFTER"} as Record<string,LegalOperator>)[value??""]??"NONE"; }
function inferFactType(text:string,numbers:NumericValue[]):LegalFactType { if(/\uBC8C\uAE08|\uC9D5\uC5ED|\uACFC\uD0DC\uB8CC/.test(text)) return "PENALTY"; if(/\uD589\uC815\uCC98\uBD84|\uC815\uC9C0|\uCDE8\uC18C/.test(text)) return "ADMINISTRATIVE_SANCTION"; if(/\uB2E4\uB9CC|\uC81C\uC678/.test(text)) return "EXCEPTION"; if(numbers.length) return "NUMERIC_THRESHOLD"; if(/\uD558\uC5EC\uC57C|\uC758\uBB34/.test(text)) return "OBLIGATION"; if(/\uAE08\uC9C0|\uD558\uC5EC\uC11C\uB294 \uC544\uB2C8/.test(text)) return "PROHIBITION"; if(/\uC815\uC758|\uB780/.test(text)) return "DEFINITION"; if(/\uC81C\d+\uC870/.test(text)) return "CROSS_REFERENCE"; return "REQUIREMENT"; }
function inferSubject(text:string){ return text.split(/[\uC740\uB294\uC774\uAC00]/)[0]?.slice(0,80)||"LEGAL_SUBJECT"; }
function inferPredicate(text:string){ if(/\uC2E0\uACE0/.test(text)) return "REPORT"; if(/\uC2B9\uC778/.test(text)) return "APPROVAL"; if(/\uC778\uC99D/.test(text)) return "CERTIFICATION"; if(/\uAE08\uC9C0/.test(text)) return "PROHIBITION"; return "LEGAL_RULE"; }
function inferGroupOperator(text:string):LegalFactCandidate["groupOperator"] { if(/\uC5B4\uB290 \uD558\uB098|\uB610\uB294/.test(text)) return "OR"; if(/\uBC0F|\uAC01\uAC01/.test(text)) return "AND"; return "NONE"; }
function extractSentences(text:string,markers:string[]){return text.split(/(?<=[.\uB2E4])\s+/).filter((part)=>markers.some((marker)=>part.includes(marker)));}
