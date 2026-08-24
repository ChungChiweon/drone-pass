import { validateTechnicalKnowledge, type TechnicalKnowledgeLike } from "./flight-004c-validation-types";
export const validatePropulsionComponent = (item: TechnicalKnowledgeLike) => validateTechnicalKnowledge(item, "PROPULSION_COMPONENT", "AVIATION_GENERAL");
