export type WeatherManualFileValidation = {
  valid: boolean;
  detectedType: "PDF" | "HTML" | "UNKNOWN";
  blockers: string[];
};

export function validateWeatherManualFile(bytes: Uint8Array): WeatherManualFileValidation {
  const prefix = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 1024)));
  const detectedType = prefix.startsWith("%PDF") ? "PDF" : /<html|<!doctype/i.test(prefix) ? "HTML" : "UNKNOWN";
  const blockers: string[] = [];
  if (bytes.length < 1024) blockers.push("FILE_TOO_SMALL");
  if (/firewall|access denied|blocked|web.?firewall/i.test(prefix)) blockers.push("FIREWALL_BODY");
  if (detectedType !== "PDF") blockers.push("PDF_SIGNATURE_MISSING");
  return { valid: blockers.length === 0, detectedType, blockers };
}
