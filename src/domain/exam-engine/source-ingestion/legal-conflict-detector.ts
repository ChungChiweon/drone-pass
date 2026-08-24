import type { LegalConflict, LegalFactCandidate } from "./ingestion-types";

type ExistingFact={id:string;statement:string;value?:unknown;unit?:string|null;operator?:string;conditions?:unknown[];exceptions?:unknown[];sourceDocumentId?:string};
export function detectLegalConflicts(candidates:readonly LegalFactCandidate[],facts:readonly ExistingFact[]):LegalConflict[]{
  const conflicts:LegalConflict[]=[];
  for(const candidate of candidates){
    const candidateNumbers=numbers(candidate.normalizedStatement);
    for(const fact of facts){
      if(!fact.statement||similarity(candidate.normalizedStatement,fact.statement)<0.42)continue;
      const factNumbers=numbers(fact.statement);
      if(candidateNumbers.length&&factNumbers.length&&candidateNumbers.join("|")!==factNumbers.join("|")) conflicts.push(conflict(candidate,fact,"VALUE_CONFLICT"));
      else if(candidate.operator!=="NONE"&&fact.operator&&mapOperator(fact.operator)!==candidate.operator) conflicts.push(conflict(candidate,fact,"OPERATOR_CONFLICT"));
    }
  }
  return dedupe(conflicts);
}
function conflict(candidate:LegalFactCandidate,fact:ExistingFact,type:LegalConflict["type"]):LegalConflict{return{conflictId:`CONFLICT-${type}-${candidate.candidateId}-${fact.id}`,candidateId:candidate.candidateId,factId:fact.id,type,currentEvidence:candidate.normalizedStatement,existingEvidence:fact.statement,resolution:"REVIEW_REQUIRED",preferredAuthority:"CURRENT_OFFICIAL_LAW"};}
function numbers(value:string){return value.match(/\d+(?:[,.]\d+)?/g)??[];}
function similarity(a:string,b:string){const aa=grams(a);const bb=grams(b);return [...aa].filter((x)=>bb.has(x)).length/Math.max(Math.min(aa.size,bb.size),1);}
function grams(value:string){const normalized=value.replace(/\d+(?:[,.]\d+)?/g,"#").replace(/\s+/g,"");const result=new Set<string>();for(let index=0;index<normalized.length-1;index++)result.add(normalized.slice(index,index+2));return result;}
function mapOperator(value:string){return({gte:"GTE",lte:"LTE",gt:"GT",lt:"LT",eq:"EQ"} as Record<string,string>)[value.toLowerCase()]??value;}
function dedupe(items:LegalConflict[]){const seen=new Set<string>();return items.filter((item)=>{const key=`${item.factId}|${item.type}|${item.candidateId}`;if(seen.has(key))return false;seen.add(key);return true;});}
