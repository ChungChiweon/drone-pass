import type {
  ParsedWeatherCode,
  ParsedWeatherCodeToken,
  WeatherCodeDefinition,
} from "./weather-code";

function parsedToken(
  token: string,
  definitions: ReadonlyMap<string, WeatherCodeDefinition>,
): ParsedWeatherCodeToken {
  const definition = definitions.get(token);
  return definition
    ? { token, definition, status: "SUPPORTED" }
    : { token, status: "UNKNOWN_TOKEN" };
}

export function parseWeatherCode(
  raw: string,
  supportedDefinitions: readonly WeatherCodeDefinition[],
): ParsedWeatherCode {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const first = tokens[0];
  const codeType: ParsedWeatherCode["codeType"] = first === "METAR" || first === "SPECI" ? first : "UNKNOWN";
  if (codeType !== "UNKNOWN") tokens.shift();
  const definitions = new Map(supportedDefinitions.map((definition) => [definition.token, definition]));
  const result: ParsedWeatherCode = {
    raw,
    codeType,
    weather: [],
    cloud: [],
    remarks: [],
    unknownTokens: [],
  };

  if (tokens[0]?.match(/^[A-Z]{4}$/)) result.station = tokens.shift();
  if (tokens[0]?.match(/^\d{6}Z$/)) result.time = tokens.shift();

  let inRemarks = false;
  for (const token of tokens) {
    if (token === "RMK") {
      inRemarks = true;
      continue;
    }
    const parsed = parsedToken(token, definitions);
    if (parsed.status === "UNKNOWN_TOKEN") result.unknownTokens.push(token);
    if (inRemarks) result.remarks.push(parsed);
    else if (/^(FEW|SCT|BKN|OVC|VV)/.test(token)) result.cloud.push(parsed);
    else if (/^\d{3}\d{2}(G\d{2})?KT$/.test(token)) result.wind = parsed;
    else if (/^\d{4}$/.test(token)) result.visibility = parsed;
    else if (/^M?\d{2}\/M?\d{2}$/.test(token)) {
      result.temperature = parsed;
      result.dewPoint = parsed;
    } else if (/^Q\d{4}$/.test(token)) result.pressure = parsed;
    else result.weather.push(parsed);
  }
  return result;
}
