import { describe, expect, it } from "vitest";
import { validateWeatherManualFile } from "./weather-manual-file-validator";

describe("weather manual file firewall", () => {
  it("blocks a tiny web-firewall HTML body", () => {
    const result = validateWeatherManualFile(new TextEncoder().encode("<html>web firewall blocked</html>"));
    expect(result.valid).toBe(false);
    expect(result.blockers).toContain("FIREWALL_BODY");
  });
  it("accepts a plausibly sized PDF payload", () => {
    const bytes = new TextEncoder().encode(`%PDF-1.7\n${"x".repeat(2048)}`);
    expect(validateWeatherManualFile(bytes).valid).toBe(true);
  });
});
