import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(path.resolve(__dirname, "202607270001_knowledge_pack_server_storage.sql"), "utf8");

describe("knowledge pack migration safety", () => {
  it("creates all four RLS-protected tables and transactional RPCs", () => {
    for (const table of ["knowledge_packs", "knowledge_pack_active", "knowledge_review_metadata", "knowledge_review_audit"]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("function public.import_knowledge_pack_and_activate");
    expect(sql).toContain("function public.update_atomic_fact_review");
    expect(sql).toContain("function public.update_review_checklist");
  });

  it("keeps audit append-only and forbids ACTIVE deletion by omission", () => {
    expect(sql).not.toMatch(/create policy "[^"]+" on public\.knowledge_review_audit\s+for update/i);
    expect(sql).not.toMatch(/create policy "[^"]+" on public\.knowledge_review_audit\s+for delete/i);
    expect(sql).not.toMatch(/create policy "[^"]+" on public\.knowledge_pack_active\s+for delete/i);
  });

  it("requires explicit overwrite and records auth.uid with approval mode", () => {
    expect(sql).toContain("and not p_overwrite");
    expect(sql).toContain("raise exception 'PACK_EXISTS'");
    expect(sql).toContain("approval_mode, reviewed_by");
    expect(sql).toContain("p_approval_mode, auth.uid()");
  });
});
