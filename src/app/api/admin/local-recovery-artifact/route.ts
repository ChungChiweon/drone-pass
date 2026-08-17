import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const ALLOWED_FILES = new Set([
  "fact-approval-recovery-before-20260731.json",
  "prod-active-export-20260731-26approved.json",
  "local-recovery-state-20260731.json",
  "runtime-active-graph-benchmark-20260801.json",
  "graph-activation-final-state-20260801.json"
]);

const ALLOWED_PREFIXES = [
  "graph-activation-before-",
  "graph-activation-after-",
  "graph-activation-rollback-",
  "graph-activation-reactivation-"
  ,"canary-before-"
];

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Development only." }, { status: 403 });
  }
  const { fileName, payload } = await request.json() as { fileName?: string; payload?: unknown };
  const isAllowed = Boolean(fileName && (ALLOWED_FILES.has(fileName) || ALLOWED_PREFIXES.some((prefix) => fileName.startsWith(prefix) && fileName.endsWith(".json"))));
  if (!fileName || !isAllowed) {
    return NextResponse.json({ error: "Invalid artifact name." }, { status: 400 });
  }
  const directory = fileName.startsWith("prod-active-export")
    ? path.join(process.cwd(), "work", "exports")
    : fileName.startsWith("canary-before-")
      ? path.join(process.cwd(), "work", "canary-promotion")
    : path.join(process.cwd(), "work", "graph-version-snapshots");
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, fileName);
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return NextResponse.json({ path: target });
}
