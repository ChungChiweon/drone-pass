import type {FlightSourceReference} from "../knowledge";
export type FlightOperationPhase="PREFLIGHT"|"IN_FLIGHT"|"LANDING"|"POSTFLIGHT";
export type ExtractedOperationalProcedure={procedureId:string;name:string;phase:FlightOperationPhase;steps:string[];prerequisites:string[];conditions:string[];decisionPoints:string[];warnings:string[];sourceReferences:FlightSourceReference[];ordered:boolean;orderingEvidence:string;rawEvidenceText:string;extractionConfidence:number;topicIds:string[]};
export type ChecklistItem={checklistId:string;phase:FlightOperationPhase;item:string;purpose:string;condition:string;warning:string;sourceReference:FlightSourceReference;rawEvidenceText:string;topicIds:string[]};
export type OperationalDecision={decisionId:string;monitoredCondition:string;trigger:string;decision:string;alternatives:string[];limitations:string[];sourceReferences:FlightSourceReference[];rawEvidenceText:string;topicIds:string[]};
export type ExtractedSafetyKnowledge={safetyId:string;title:string;hazard:string;preventiveAction:string;condition:string;phase:FlightOperationPhase;sourceReferences:FlightSourceReference[];evidence:string;confidence:number;topicIds:string[]};
