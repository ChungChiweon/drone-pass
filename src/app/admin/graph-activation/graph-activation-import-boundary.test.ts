import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("graph activation import boundary", () => {
  it("keeps page.tsx as a thin server wrapper", () => {
    const page = source("src/app/admin/graph-activation/page.tsx");

    expect(page).not.toContain("\"use client\"");
    expect(page).toContain("import GraphActivationClient from \"./graph-activation-client\"");
    expect(page).not.toContain("local-knowledge-graph-repository");
    expect(page).not.toContain("local-knowledge-pack-repository");
    expect(page).not.toContain("graph-version-activation-browser-service");
    expect(page).not.toContain("next/server");
  });

  it("prevents the client component from importing server-only modules", () => {
    const client = source("src/app/admin/graph-activation/graph-activation-client.tsx");

    expect(client).toContain("\"use client\"");
    expect(client).toContain("graph-version-activation-browser-service");
    expect(client).not.toContain("node:fs");
    expect(client).not.toContain("node:path");
    expect(client).not.toContain("process.cwd");
    expect(client).not.toContain("next/server");
    expect(client).not.toContain("next/headers");
    expect(client).not.toContain("local-recovery-artifact/route");
    expect(client).not.toContain("@/domain/exam-engine/types\"");
  });

  it("prevents the API route from importing browser activation code", () => {
    const route = source("src/app/api/admin/local-recovery-artifact/route.ts");

    expect(route).toContain("next/server");
    expect(route).not.toContain("graph-version-activation-browser-service");
    expect(route).not.toContain("local-knowledge-graph-repository");
    expect(route).not.toContain("graph-activation-client");
  });

  it("keeps activation core free of browser and Next runtime access", () => {
    const core = source("src/domain/exam-engine/knowledge-graph/graph-version-activation-service.ts");

    expect(core).not.toContain("window.");
    expect(core).not.toContain("localStorage");
    expect(core).not.toContain("node:fs");
    expect(core).not.toContain("node:path");
    expect(core).not.toContain("next/server");
    expect(core).not.toContain("next/headers");
    expect(core).not.toContain("local-knowledge-graph-repository");
  });

  it("keeps top-level browser work out of the client component", () => {
    const client = source("src/app/admin/graph-activation/graph-activation-client.tsx");
    const firstRuntimeFunction = client.indexOf("async function saveArtifact");
    const topLevelDeclarations = client.slice(0, firstRuntimeFunction);

    expect(topLevelDeclarations).not.toContain("window.");
    expect(topLevelDeclarations).not.toContain("localStorage");
    expect(topLevelDeclarations).not.toContain("fetch(");
    expect(topLevelDeclarations).not.toContain("new Date(");
  });
});
