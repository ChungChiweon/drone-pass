import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.join(process.cwd(), "src", "app", "admin", "autonomous-promotion-canary", "autonomous-promotion-canary-client.tsx"), "utf8");
describe("Canary recovery UI safety", () => {
  it("uses repository storage constants and exact-origin diagnostics", () => { expect(source).toContain("KNOWLEDGE_PACK_CACHE_KEY"); expect(source).toContain("ACTIVE_PACK_CACHE_KEY"); expect(source).toContain('value.origin !== "http://localhost:4450"'); expect(source).toContain("location.origin"); });
  it("guards Apply with preflight, phrase, token, and in-flight state", () => { expect(source).toContain("const canApply = !running && blockers.length === 0"); expect(source).toContain("disabled={!canApply}"); expect(source).toContain("CANARY_CONFIRMATION_PHRASE_REQUIRED"); expect(source).toContain("isCanaryTokenMatch"); });
  it("saves a full recovery artifact before mutation and restores raw storage on failure", () => { expect(source).toContain("fullPackPayload"); expect(source).toContain("fullGraphPayload"); expect(source).toContain("SNAPSHOT_ARTIFACT_SAVE_FAILED"); expect(source).toContain("Object.entries(rawBefore)"); });
});
