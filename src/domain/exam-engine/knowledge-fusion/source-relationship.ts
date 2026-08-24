export type SourceRelationshipType = "IMPLEMENTS" | "REFERENCES" | "EXPLAINS" | "SUMMARIZES" | "UPDATES";

export type SourceRelationship = {
  parentSourceId: string;
  childSourceId: string;
  relationshipType: SourceRelationshipType;
};

export function findSourceChildren(relationships: SourceRelationship[], sourceId: string) {
  return relationships.filter((relationship) => relationship.parentSourceId === sourceId);
}

export function findSourceParents(relationships: SourceRelationship[], sourceId: string) {
  return relationships.filter((relationship) => relationship.childSourceId === sourceId);
}

export function relationshipWeight(type: SourceRelationshipType) {
  if (type === "IMPLEMENTS") return 0.3;
  if (type === "UPDATES") return 0.28;
  if (type === "REFERENCES") return 0.22;
  if (type === "EXPLAINS") return 0.14;
  return 0.1;
}
