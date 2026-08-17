import type { VisualAssetRecord } from "../source-acquisition";
import type { WeatherVisualLink } from "./weather-ingestion-types";

export function linkWeatherVisuals(
  assets: readonly VisualAssetRecord[],
  topicKnowledgeIds: ReadonlyMap<string, readonly string[]>,
): WeatherVisualLink[] {
  return assets.map((asset) => ({
    assetId: asset.assetId,
    sourceId: asset.sourceId,
    associatedKnowledgeIds: [...(topicKnowledgeIds.get(asset.associatedTopic) ?? asset.associatedKnowledgeIds)],
    associatedTopic: asset.associatedTopic,
    caption: asset.caption,
    sourceLocator: { sourceId: asset.sourceId, page: asset.page },
    interpretationAvailable: false,
  }));
}
