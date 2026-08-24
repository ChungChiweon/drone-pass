import type {ShadowExamFact} from "../shadow-pack";
export type LegalDistractorIndex={factsById:Map<string,ShadowExamFact>;byTopic:Map<string,string[]>;byFactType:Map<string,string[]>;byUnit:Map<string,string[]>;byPredicate:Map<string,string[]>;byConcept:Map<string,string[]>};
export type LegalDistractorQueryResult={factIds:string[];fullScanFallbackUsed:boolean;scannedCandidateCount:number};
