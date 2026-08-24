import type {FlightSourceReference} from "./flight-knowledge-types";

export type HumanFactorType="FATIGUE"|"STRESS"|"ATTENTION"|"SITUATIONAL_AWARENESS"|"DECISION_MAKING"|"HUMAN_ERROR"|"COMMUNICATION"|"OTHER";
export type HumanFactorKnowledge={humanFactorId:string;factorType:HumanFactorType;name:string;definition:string;effects:string[];indicators:string[];contributingConditions:string[];mitigations:string[];sourceReferences:FlightSourceReference[];rawEvidenceText:string;confidence:number};
export type RiskManagementKnowledge={riskId:string;hazard:string;likelihood:string;severity:string;riskLevel:string;assessmentMethod:string;mitigation:string;residualRisk:string;sourceReferences:FlightSourceReference[];rawEvidenceText:string};
export type CrewCoordinationKnowledge={coordinationId:string;name:string;roles:string[];communicationPattern:string;coordinationPrinciple:string;decisionSupport:string;context:"SMALL_UAS"|"GENERAL_AVIATION_CONTEXT";sourceReferences:FlightSourceReference[];rawEvidenceText:string};
export type MaintenanceKnowledge={maintenanceId:string;maintenanceType:"ROUTINE"|"PREVENTIVE"|"CONDITION_BASED"|"REPAIR"|"INSPECTION"|"RECORD_KEEPING";targetComponent:string;purpose:string;triggerCondition:string;actions:string[];interval:string;recordRequirement:string;sourceReferences:FlightSourceReference[];rawEvidenceText:string};
export type InspectionKnowledge={inspectionId:string;inspectionType:string;purpose:string;triggerCondition:string;scope:string[];lineage:string[];sourceReferences:FlightSourceReference[];rawEvidenceText:string};
