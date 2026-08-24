import type {
  VisualAssetRecord,
  WeatherSourceLocator,
  WeatherSourceMetadata,
} from "../source-acquisition";
import type {
  WeatherCodeDefinition,
  WeatherConcept,
  WeatherHazard,
  WeatherObservation,
  WeatherOperationalImpact,
  WeatherPhenomenon,
  WeatherRelationship,
  WeatherRelationshipType,
} from "../knowledge";

export type WeatherIngestionStatus =
  | "COMPLETED"
  | "COMPLETED_WITH_WARNINGS"
  | "PARTIAL"
  | "FAILED";

export type NormalizedWeatherPage = {
  page: number;
  text: string;
  sections: string[];
};

export type NormalizedWeatherDocument = {
  sourceId: string;
  title: string;
  pages: NormalizedWeatherPage[];
  extractionMethod: string;
};

export type WeatherTaxonomyRule = {
  knowledgeId: string;
  topic: string;
  name: string;
  aliases: string[];
  kind: "concept" | "phenomenon" | "hazard" | "observation" | "operational-impact";
  sourceIds?: string[];
  pageRange?: [number, number];
  measuredVariables?: string[];
  units?: string[];
  instrument?: string;
  aircraftContext?: string;
};

export type WeatherRelationshipRule = {
  sourceKnowledgeId: string;
  targetKnowledgeId: string;
  sourceAliases: string[];
  targetAliases: string[];
  relationType: WeatherRelationshipType;
};

export type WeatherEvidence = {
  text: string;
  locator: WeatherSourceLocator;
};

export type WeatherVisualLink = {
  assetId: string;
  sourceId: string;
  associatedKnowledgeIds: string[];
  associatedTopic: string;
  caption?: string;
  sourceLocator: WeatherSourceLocator;
  interpretationAvailable: boolean;
};

export type WeatherIngestionInput = {
  source: WeatherSourceMetadata;
  document: NormalizedWeatherDocument;
  taxonomy: WeatherTaxonomyRule[];
  relationshipRules: WeatherRelationshipRule[];
  visualInventory: VisualAssetRecord[];
};

export type WeatherIngestionResult = {
  jobId: string;
  sourceId: string;
  sectionsProcessed: number;
  pagesProcessed: number;
  concepts: WeatherConcept[];
  phenomena: WeatherPhenomenon[];
  hazards: WeatherHazard[];
  observations: WeatherObservation[];
  weatherCodes: WeatherCodeDefinition[];
  operationalImpacts: WeatherOperationalImpact[];
  relationships: WeatherRelationship[];
  visualLinks: WeatherVisualLink[];
  warnings: string[];
  errors: string[];
  extractionQuality: number;
  status: WeatherIngestionStatus;
};
