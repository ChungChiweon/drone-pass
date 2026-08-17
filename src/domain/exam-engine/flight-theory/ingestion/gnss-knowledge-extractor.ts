import { extractNavigationConcept,type NavigationConcept } from "./navigation-concept-extractor";
export function extractGnssKnowledge(input:NavigationConcept):NavigationConcept|null{if(/position hold|return to home|home point|geofenc/i.test(input.statement))return null;return extractNavigationConcept(input)}
