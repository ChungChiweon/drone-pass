import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("autonomous promotion development freeze", () => {
  for (const route of ["autonomous-promotion-canary", "autonomous-promotion-batch-plan"]) {
    it(`${route} fails closed outside development`, () => {
      const source = readFileSync(join(process.cwd(), "src/app/admin", route, "page.tsx"), "utf8");
      expect(source).toContain('process.env.NODE_ENV !== "development"');
      expect(source).toContain("notFound()");
    });
  }
});
