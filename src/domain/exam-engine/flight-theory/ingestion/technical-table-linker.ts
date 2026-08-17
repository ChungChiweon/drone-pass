export type TechnicalTableCandidate={tableId:string;sourceId:string;page:number;title:string;headers:string[];topic:string;interpretationRequired:boolean;status:"TABLE_CANDIDATE"|"PAGE_REVIEW_REQUIRED"|"NOT_RELEVANT"};
export function linkTechnicalTable(table:TechnicalTableCandidate,knowledgeIds:string[]){return {...table,knowledgeIds:[...new Set(knowledgeIds)]}}
