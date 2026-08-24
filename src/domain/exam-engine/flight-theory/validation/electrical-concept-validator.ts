import { validateTechnicalKnowledge, type TechnicalKnowledgeLike } from "./flight-004c-validation-types";
export const validateElectricalConcept = (item: TechnicalKnowledgeLike) => validateTechnicalKnowledge(item, "ELECTRICAL_CONCEPT", "ELECTRICAL_GENERAL");
